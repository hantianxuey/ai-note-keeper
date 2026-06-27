import { Response, NextFunction } from 'express';
import { llmService } from '../services/llmService';
import { vectorSearchService } from '../services/vectorSearchService';
import { embeddingService } from '../services/embeddingService';
import { ConversationModel } from '../models/Conversation';
import { NoteModel } from '../models/Note';
import type { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { requireUserId } from './controllerUtils';

const isChineseQuestion = (question: string) => /[\u4e00-\u9fff]/.test(question);

const isNoteInventoryQuestion = (question: string): boolean => {
  const normalized = question.toLowerCase();
  return (
    /(?:\u591a\u5c11|\u51e0\u7bc7|\u51e0\u6761|\u603b\u5171|\u4e00\u5171|\u5168\u90e8|\u6240\u6709).*(?:\u7b14\u8bb0|note)/i.test(question) ||
    /(?:\u7b14\u8bb0|notes?).*(?:\u591a\u5c11|\u51e0\u7bc7|\u51e0\u6761|\u603b\u5171|\u4e00\u5171|\u5168\u90e8|\u6240\u6709)/i.test(question) ||
    /\b(how many|count|total number of|list|show all|all)\b.*\bnotes?\b/.test(normalized) ||
    /\bnotes?\b.*\b(count|total|list|all)\b/.test(normalized)
  );
};

const formatNoteInventoryAnswer = (question: string, notes: Array<{ title: string }>): string => {
  const titles = notes.map((note, index) => `${index + 1}. ${note.title}`).join('\n');
  if (isChineseQuestion(question)) {
    if (notes.length === 0) {
      return '你当前还没有笔记。';
    }
    return `你当前共有 ${notes.length} 篇笔记。\n\n${titles}`;
  }

  if (notes.length === 0) {
    return 'You currently have no notes.';
  }
  return `You currently have ${notes.length} notes.\n\n${titles}`;
};

export const askQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const { question, conversationId, provider, model, embeddingProvider } = req.body;

    if (!question) {
      return next(new AppError('Question is required', 400));
    }

    const finalProvider = provider || 'demo';
    const finalModel = model || 'demo-chat';
    const finalEmbeddingProvider = embeddingProvider || await embeddingService.getDefaultProviderForUser(userId);

    let conversation = conversationId
      ? await ConversationModel.findById(conversationId, userId)
      : null;

    if (!conversation) {
      const title = question.length > 50 ? question.substring(0, 50) + '...' : question;
      conversation = await ConversationModel.create(userId, title, []);
    }

    const userMessage = {
      role: 'user' as const,
      content: question,
      timestamp: Date.now(),
    };

    if (isNoteInventoryQuestion(question)) {
      const notes = await NoteModel.findAllByUserId(userId);
      const answer = formatNoteInventoryAnswer(question, notes);
      const assistantMessage = {
        role: 'assistant' as const,
        content: answer,
        citations: [],
        timestamp: Date.now(),
      };

      await ConversationModel.updateMessages(conversation.id, userId, [
        ...(conversation.messages || []),
        userMessage,
        assistantMessage,
      ]);

      return res.json({
        answer,
        citations: [],
        conversationId: conversation.id,
        retrieval: { status: notes.length > 0 ? 'ok' : 'empty' },
        metadata: {
          provider: finalProvider,
          model: finalModel,
          embeddingProvider: finalEmbeddingProvider,
          citationCount: 0,
          noteCount: notes.length,
        },
      });
    }

    const { context, citations, retrieval } = await vectorSearchService.getContextForQuestion(userId, question, 5, finalEmbeddingProvider);

    const answer = await llmService.ragAnswer(question, context, {
      provider: finalProvider,
      model: finalModel,
      temperature: 0.7,
    }, userId);

    const assistantMessage = {
      role: 'assistant' as const,
      content: answer,
      citations,
      timestamp: Date.now(),
    };

    await ConversationModel.updateMessages(conversation.id, userId, [
      ...(conversation.messages || []),
      userMessage,
      assistantMessage,
    ]);

    res.json({
      answer,
      citations,
      conversationId: conversation.id,
      retrieval,
      metadata: {
        provider: finalProvider,
        model: finalModel,
        embeddingProvider: finalEmbeddingProvider,
        citationCount: citations.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listConversations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const conversations = await ConversationModel.findAllByUserId(userId);
    res.json({ conversations });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const conversationId = parseInt(req.params.id);
    const conversation = await ConversationModel.findById(conversationId, userId);

    if (!conversation) {
      return next(new AppError('Conversation not found', 404));
    }

    res.json({ conversation });
  } catch (error) {
    next(error);
  }
};

export const deleteConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const conversationId = parseInt(req.params.id);
    const deleted = await ConversationModel.delete(conversationId, userId);

    if (!deleted) {
      return next(new AppError('Conversation not found', 404));
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const reindexNotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const count = await vectorSearchService.reindexUserNotes(requireUserId(req));
    res.json({ message: `Reindexed ${count} notes`, count });
  } catch (error) {
    next(error);
  }
};
