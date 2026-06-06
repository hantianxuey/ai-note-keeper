import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const nonEmptyString = z.string().trim().min(1);
const optionalSensitiveString = z.string().trim().min(1).optional();

export const verificationCodeRequestSchema = z.object({
  email: z.string().email(),
});

const authPasswordRequestBaseSchema = z.object({
  email: z.string().email(),
  password: optionalSensitiveString,
  encryptedPassword: optionalSensitiveString,
  verificationCode: optionalSensitiveString,
});

export const authPasswordRequestSchema = authPasswordRequestBaseSchema.refine((body) => Boolean(body.password || body.encryptedPassword), {
  message: 'Password is required',
  path: ['password'],
});

export const resetPasswordRequestSchema = authPasswordRequestBaseSchema.extend({
  verificationCode: nonEmptyString,
}).refine((body) => Boolean(body.password || body.encryptedPassword), {
  message: 'Password is required',
  path: ['password'],
});

export const noteInputSchema = z.object({
  title: nonEmptyString,
  content: nonEmptyString,
  markdownContent: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  category: z.string().nullable().optional(),
});

export const ragAskRequestSchema = z.object({
  question: nonEmptyString,
  conversationId: z.number().int().positive().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  embeddingProvider: z.string().optional(),
});

export const providerKeyRequestSchema = z.object({
  provider: nonEmptyString,
  apiKey: optionalSensitiveString,
  encryptedApiKey: optionalSensitiveString,
  model: z.string().optional(),
}).refine((body) => Boolean(body.apiKey || body.encryptedApiKey), {
  message: 'apiKey is required',
  path: ['apiKey'],
});

export const providerTestRequestSchema = z.object({
  provider: nonEmptyString,
  model: nonEmptyString,
});

export const llmContentRequestSchema = z.object({
  content: nonEmptyString,
  provider: z.string().optional(),
  model: z.string().optional(),
  noteId: z.union([z.number().int().positive(), z.string()]).optional(),
});

export const llmRewriteRequestSchema = llmContentRequestSchema.extend({
  instruction: z.string().optional(),
});

export const llmMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: nonEmptyString,
});

export const llmChatRequestSchema = z.object({
  messages: z.array(llmMessageSchema).min(1),
  provider: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
});

const toOpenApiSchema = (schema: z.ZodTypeAny, name: string) => {
  const jsonSchema = zodToJsonSchema(schema as any, {
    name,
    target: 'openApi3',
  } as any) as { definitions?: Record<string, unknown> };

  return jsonSchema.definitions?.[name] || jsonSchema;
};

export const openApiComponentSchemas = {
  VerificationCodeRequest: toOpenApiSchema(verificationCodeRequestSchema, 'VerificationCodeRequest'),
  AuthPasswordRequest: toOpenApiSchema(authPasswordRequestSchema, 'AuthPasswordRequest'),
  ResetPasswordRequest: toOpenApiSchema(resetPasswordRequestSchema, 'ResetPasswordRequest'),
  NoteInput: toOpenApiSchema(noteInputSchema, 'NoteInput'),
  RagAskRequest: toOpenApiSchema(ragAskRequestSchema, 'RagAskRequest'),
  ProviderKeyInput: toOpenApiSchema(providerKeyRequestSchema, 'ProviderKeyInput'),
  ProviderTestRequest: toOpenApiSchema(providerTestRequestSchema, 'ProviderTestRequest'),
  LlmContentRequest: toOpenApiSchema(llmContentRequestSchema, 'LlmContentRequest'),
  LlmRewriteRequest: toOpenApiSchema(llmRewriteRequestSchema, 'LlmRewriteRequest'),
  LlmChatRequest: toOpenApiSchema(llmChatRequestSchema, 'LlmChatRequest'),
};
