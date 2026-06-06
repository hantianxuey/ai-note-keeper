import pool from '../config/database';
import { logger } from '../config/logger';
import { RagRetrievalSource, recordRagRetrieval } from '../observability/metrics';
import { Citation, RetrievalMetadata } from '../types';
import { embeddingService } from './embeddingService';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

const MAX_VECTOR_DISTANCE_ABSOLUTE = 20;
const MAX_VECTOR_DISTANCE_RATIO = 1.15;
const MIN_VECTOR_DISTANCE_FOR_TRUST = 1.0;
const MAX_SNIPPET_LENGTH = 2000;
const MAX_CONTEXT_TOTAL_LENGTH = 8000;
const MAX_FALLBACK_RESULTS = 3;

type SearchSource = Exclude<RagRetrievalSource, 'none'>;

type SearchRow = {
  note_id: number;
  title: string;
  snippet: string;
  rank: number;
  source: SearchSource;
};

const snippetFor = (content: string): string =>
  content.substring(0, MAX_SNIPPET_LENGTH) + (content.length > MAX_SNIPPET_LENGTH ? '...' : '');

function splitIntoChunks(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  if (!text || text.trim().length === 0) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize - overlap;
    if (start >= text.length) break;
  }
  return chunks;
}

function extractKeywords(text: string): string[] {
  const englishStopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and',
    'or', 'if', 'while', 'about', 'up', 'it', 'its', 'this', 'that',
    'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
    'him', 'his', 'she', 'her', 'they', 'them', 'their', 'what', 'which',
    'who', 'whom',
  ]);

  const chineseStopWords = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
    '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有',
    '看', '好', '自己', '这', '那', '还', '什么', '吗', '呢', '吧',
    '讲了', '笔记', '测试', '讲', '啊',
  ]);

  const processed = text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, ' ');

  const englishWords = processed.match(/[a-zA-Z0-9]+/g) || [];
  const chineseWords: string[] = [];
  const chineseChars = processed.match(/[\u4e00-\u9fff]+/g) || [];
  for (const str of chineseChars) {
    for (let i = 0; i < str.length; i++) {
      if (i + 2 <= str.length) chineseWords.push(str.slice(i, i + 3));
      if (i + 1 <= str.length) chineseWords.push(str.slice(i, i + 2));
      chineseWords.push(str.slice(i, i + 1));
    }
  }

  const words = [...englishWords, ...chineseWords]
    .filter((w) => w.length > 0)
    .filter((w) => !englishStopWords.has(w))
    .filter((w) => !chineseStopWords.has(w));

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word]) => word);
}

class VectorSearchService {
  private isChunkTableReady = false;

  private async ensureChunkTable(): Promise<boolean> {
    if (this.isChunkTableReady) return true;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS note_chunks (
          id SERIAL PRIMARY KEY,
          note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          chunk_index INTEGER NOT NULL DEFAULT 0,
          content TEXT NOT NULL,
          keywords TEXT[] DEFAULT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_note_chunks_note_id ON note_chunks(note_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_note_chunks_user_id ON note_chunks(user_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_note_chunks_keywords ON note_chunks USING GIN (keywords)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_note_chunks_search ON note_chunks USING GIN (to_tsvector(\'english\', content))');
      this.isChunkTableReady = true;
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Failed to create note_chunks table');
      return false;
    }
  }

  private getDefaultProvider(userId: number): Promise<string> {
    return embeddingService.getDefaultProviderForUser(userId);
  }

  async indexNote(noteId: number, userId: number, title: string, content: string, provider?: string): Promise<void> {
    try {
      const ready = await this.ensureChunkTable();
      if (!ready) return;

      const effectiveProvider = provider || await this.getDefaultProvider(userId);
      const plainContent = content
        .replace(/<img\b[^>]*>/gi, '')
        .replace(/!\[[^\]]*]\([^)]*\)/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/[#*`>\-]/g, '');
      const fullText = `${title}\n\n${plainContent}`;
      const chunks = splitIntoChunks(fullText);

      await pool.query('DELETE FROM note_chunks WHERE note_id = $1', [noteId]);

      for (let i = 0; i < chunks.length; i++) {
        const chunkKeywords = extractKeywords(chunks[i]);
        await pool.query(
          `INSERT INTO note_chunks (note_id, user_id, chunk_index, content, keywords)
           VALUES ($1, $2, $3, $4, $5)`,
          [noteId, userId, i, chunks[i], chunkKeywords]
        );
      }

      embeddingService.indexNote(noteId, userId, title, plainContent, effectiveProvider).catch((error) => {
        logger.warn({ err: error, noteId, userId, provider: effectiveProvider }, 'Vector indexing failed');
      });
    } catch (error) {
      logger.error({ err: error, noteId, userId }, 'Failed to index note chunks');
    }
  }

  async removeNoteIndex(noteId: number, userId: number): Promise<void> {
    try {
      await pool.query('DELETE FROM note_chunks WHERE note_id = $1', [noteId]);
      embeddingService.removeNote(noteId, userId).catch((error) => {
        logger.warn({ err: error, noteId, userId }, 'Vector index removal failed');
      });
    } catch (error) {
      logger.error({ err: error, noteId, userId }, 'Failed to remove note index');
    }
  }

  async search(userId: number, query: string, limit: number = 5, provider?: string): Promise<Citation[]> {
    const startedAt = process.hrtime.bigint();
    let effectiveProvider = provider || 'unknown';
    const sourceCounts: Partial<Record<RagRetrievalSource, number>> = {};
    const topScores: Partial<Record<RagRetrievalSource, number>> = {};

    const finish = (status: 'ok' | 'empty' | 'error') => {
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      recordRagRetrieval(effectiveProvider, status, durationSeconds, sourceCounts, topScores);
      logger.info({
        userId,
        provider: effectiveProvider,
        status,
        durationSeconds,
        resultSources: sourceCounts,
        topScores,
      }, 'RAG retrieval completed');
    };

    const recordLayer = (source: SearchSource, rows: SearchRow[]) => {
      sourceCounts[source] = (sourceCounts[source] || 0) + rows.length;
      const bestScore = rows.reduce<number | undefined>((best, row) => (
        best === undefined || row.rank > best ? row.rank : best
      ), undefined);
      if (bestScore !== undefined) {
        topScores[source] = bestScore;
      }
    };

    try {
      logger.info({ userId, limit, provider }, 'RAG retrieval started');
      const ready = await this.ensureChunkTable();
      if (!ready) {
        sourceCounts.none = 0;
        finish('empty');
        return [];
      }

      effectiveProvider = provider || await this.getDefaultProvider(userId);
      let results: SearchRow[] = [];
      let fallbackCount = 0;
      let vectorTrustworthy = false;

      try {
        const vectorResults = await embeddingService.search(query, limit, effectiveProvider, userId);

        if (vectorResults.length > 0) {
          vectorResults.sort((a, b) => a.distance - b.distance);

          const bestDistance = vectorResults[0].distance;
          const maxAllowedDistance = Math.min(
            MAX_VECTOR_DISTANCE_ABSOLUTE,
            bestDistance * MAX_VECTOR_DISTANCE_RATIO
          );
          const filteredResults = vectorResults.filter((r) => r.distance <= maxAllowedDistance);

          if (filteredResults.length > 0 && bestDistance < MIN_VECTOR_DISTANCE_FOR_TRUST) {
            vectorTrustworthy = true;
          }

          const vectorRows = filteredResults.map((r) => ({
            note_id: r.noteId,
            title: r.title,
            snippet: snippetFor(r.content),
            rank: 1 / (1 + Math.max(r.distance, 0)),
            source: 'vector' as const,
          }));

          recordLayer('vector', vectorRows);
          logger.info({
            userId,
            provider: effectiveProvider,
            returned: vectorResults.length,
            included: vectorRows.length,
            bestDistance,
            maxAllowedDistance,
          }, 'Vector retrieval layer completed');
          results = vectorRows;
        }
      } catch (error) {
        logger.warn({ err: error, userId, provider: effectiveProvider }, 'Vector retrieval failed; falling back to keyword search');
      }

      if (results.length < limit && !vectorTrustworthy) {
        const queryKeywords = extractKeywords(query);
        const tsTerms = queryKeywords.filter((w) => w.length > 2);

        if (tsTerms.length > 0) {
          const tsQuery = tsTerms.map((w) => w + ':*').join(' | ');
          const fullTextResult = await pool.query(
            `SELECT n.id as note_id, n.title,
                    nc.content as snippet,
                    ts_rank_cd(to_tsvector('english', nc.content), to_tsquery($1)) as rank
             FROM note_chunks nc
             JOIN notes n ON n.id = nc.note_id
             WHERE n.user_id = $2
               AND to_tsvector('english', nc.content) @@ to_tsquery($1)
             ORDER BY rank DESC
             LIMIT $3`,
            [tsQuery, userId, limit]
          );

          const existingIds = new Set(results.map((r) => r.note_id));
          const rows: SearchRow[] = [];
          for (const row of fullTextResult.rows) {
            if (!existingIds.has(row.note_id) && results.length < limit && fallbackCount < MAX_FALLBACK_RESULTS) {
              const result = {
                note_id: row.note_id,
                title: row.title,
                snippet: snippetFor(row.snippet),
                rank: Number(row.rank) * 0.5,
                source: 'fulltext' as const,
              };
              results.push(result);
              rows.push(result);
              existingIds.add(row.note_id);
              fallbackCount++;
            }
          }
          recordLayer('fulltext', rows);
          logger.info({ userId, provider: effectiveProvider, returned: fullTextResult.rows.length, included: rows.length }, 'Full-text retrieval layer completed');
        }

        if (results.length < limit && queryKeywords.length > 0 && !vectorTrustworthy) {
          const existingIds = new Set(results.map((r) => r.note_id));
          const ilikeConditions = queryKeywords.map((_, i) => `nc.content ILIKE $${i + 3}`).join(' OR ');
          const ilikeParams = queryKeywords.map((w) => `%${w}%`);
          const ilikeResult = await pool.query(
            `SELECT n.id as note_id, n.title,
                    nc.content as snippet,
                    0.1 as rank
             FROM note_chunks nc
             JOIN notes n ON n.id = nc.note_id
             WHERE n.user_id = $1
               AND (${ilikeConditions})
             LIMIT $2`,
            [userId, limit - results.length, ...ilikeParams]
          );

          const rows: SearchRow[] = [];
          for (const row of ilikeResult.rows) {
            if (!existingIds.has(row.note_id) && results.length < limit && fallbackCount < MAX_FALLBACK_RESULTS) {
              const result = {
                note_id: row.note_id,
                title: row.title,
                snippet: snippetFor(row.snippet),
                rank: Number(row.rank) * 0.3,
                source: 'ilike' as const,
              };
              results.push(result);
              rows.push(result);
              existingIds.add(row.note_id);
              fallbackCount++;
            }
          }
          recordLayer('ilike', rows);
          logger.info({ userId, provider: effectiveProvider, returned: ilikeResult.rows.length, included: rows.length }, 'ILike retrieval layer completed');
        }

        if (results.length < limit && queryKeywords.length > 0 && !vectorTrustworthy) {
          const existingIds = new Set(results.map((r) => r.note_id));
          const keywordPlaceholders = queryKeywords.map((_, i) => `$${i + 3}`).join(',');
          const keywordResult = await pool.query(
            `SELECT DISTINCT n.id as note_id, n.title,
                    nc.content as snippet,
                    0.05 as rank
             FROM note_chunks nc
             JOIN notes n ON n.id = nc.note_id
             WHERE n.user_id = $1
               AND nc.keywords && ARRAY[${keywordPlaceholders}]
             LIMIT $2`,
            [userId, limit - results.length, ...queryKeywords]
          );

          const rows: SearchRow[] = [];
          for (const row of keywordResult.rows) {
            if (!existingIds.has(row.note_id) && results.length < limit && fallbackCount < MAX_FALLBACK_RESULTS) {
              const result = {
                note_id: row.note_id,
                title: row.title,
                snippet: snippetFor(row.snippet),
                rank: Number(row.rank) * 0.2,
                source: 'keyword' as const,
              };
              results.push(result);
              rows.push(result);
              existingIds.add(row.note_id);
              fallbackCount++;
            }
          }
          recordLayer('keyword', rows);
          logger.info({ userId, provider: effectiveProvider, returned: keywordResult.rows.length, included: rows.length }, 'Keyword retrieval layer completed');
        }
      }

      if (results.length === 0) {
        sourceCounts.none = 0;
        finish('empty');
        return [];
      }

      const seen = new Set<number>();
      const citations = results
        .filter((r) => {
          if (seen.has(r.note_id)) return false;
          seen.add(r.note_id);
          return true;
        })
        .map((r, index) => ({
          noteId: r.note_id,
          noteTitle: r.title,
          snippet: r.snippet,
          sourceIndex: index + 1,
          searchSource: r.source,
          rank: r.rank,
          score: r.rank,
        }));

      finish('ok');
      return citations;
    } catch (error) {
      finish('error');
      logger.error({ err: error, userId, provider: effectiveProvider }, 'RAG retrieval failed');
      return [];
    }
  }

  async getContextForQuestion(userId: number, question: string, maxChunks: number = 5, provider?: string): Promise<{ context: string[]; citations: Citation[]; retrieval: RetrievalMetadata }> {
    const citations = await this.search(userId, question, maxChunks, provider);

    let totalLength = 0;
    const context: string[] = [];
    for (let i = 0; i < citations.length; i++) {
      const c = citations[i];
      const entry = `[Source ${i + 1}: "${c.noteTitle}"]\n${c.snippet}`;
      if (totalLength + entry.length > MAX_CONTEXT_TOTAL_LENGTH) {
        const remaining = MAX_CONTEXT_TOTAL_LENGTH - totalLength;
        if (remaining > 100) {
          context.push(entry.substring(0, remaining) + '...');
          totalLength += remaining;
        }
        break;
      }
      context.push(entry);
      totalLength += entry.length;
    }

    const trimmedCitations = citations.slice(0, context.length).map((citation, index) => ({
      ...citation,
      sourceIndex: index + 1,
    }));
    const retrieval: RetrievalMetadata = trimmedCitations.length > 0
      ? { status: 'ok' }
      : { status: 'empty', message: 'No relevant notes found in the knowledge base.' };

    return {
      context,
      citations: trimmedCitations,
      retrieval,
    };
  }

  async reindexAllNotes(): Promise<number> {
    try {
      const ready = await this.ensureChunkTable();
      if (!ready) return 0;

      const defaultProvider = 'demo';
      logger.info({ provider: defaultProvider }, 'Reindexing all notes');

      const result = await pool.query('SELECT id, user_id, title, content FROM notes');
      let count = 0;
      for (const note of result.rows) {
        await this.indexNote(note.id, note.user_id, note.title, note.content, defaultProvider);
        count++;
      }
      logger.info({ count, provider: defaultProvider }, 'Reindexed notes');
      return count;
    } catch (error) {
      logger.error({ err: error }, 'Reindex failed');
      return 0;
    }
  }
}

export const vectorSearchService = new VectorSearchService();
