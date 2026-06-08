import { openApiComponentSchemas } from '../schemas/apiSchemas';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AI Note Keeper API',
    version: '1.10.0',
    description: [
      'API for a full-stack AI note knowledge base.',
      'Authenticated endpoints use the httpOnly auth_token cookie set by login/register.',
      'Unsafe cookie-authenticated requests must also send X-CSRF-Token matching the csrf_token cookie.',
    ].join(' '),
  },
  servers: [
    { url: '/api', description: 'Same-origin API gateway' },
    { url: 'http://localhost:4000/api', description: 'Local development backend' },
  ],
  tags: [
    { name: 'Security' },
    { name: 'Auth' },
    { name: 'Notes' },
    { name: 'Attachments' },
    { name: 'LLM' },
    { name: 'Embedding' },
    { name: 'RAG' },
    { name: 'Health' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'auth_token',
      },
    },
    parameters: {
      CsrfToken: {
        name: 'X-CSRF-Token',
        in: 'header',
        required: true,
        schema: { type: 'string' },
        description: 'Must match the csrf_token cookie for unsafe cookie-authenticated requests.',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
            required: ['message'],
          },
        },
        required: ['error'],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'email'],
      },
      Note: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          user_id: { type: 'integer' },
          title: { type: 'string' },
          content: { type: 'string' },
          markdown_content: { type: 'string', nullable: true },
          tags: { type: 'array', items: { type: 'string' }, nullable: true },
          category: { type: 'string', nullable: true },
          ai_summary: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'user_id', 'title', 'content'],
      },
      NoteSummary: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          user_id: { type: 'integer' },
          title: { type: 'string' },
          preview: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' }, nullable: true },
          category: { type: 'string', nullable: true },
          ai_summary: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'user_id', 'title', 'preview'],
      },
      Citation: {
        type: 'object',
        properties: {
          noteId: { type: 'integer' },
          noteTitle: { type: 'string' },
          snippet: { type: 'string' },
          sourceIndex: { type: 'integer' },
          searchSource: { type: 'string', enum: ['vector', 'fulltext', 'ilike', 'keyword', 'demo'] },
          rank: { type: 'number' },
          score: { type: 'number' },
        },
        required: ['noteId', 'noteTitle', 'snippet'],
      },
      RetrievalMetadata: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'empty', 'error'] },
          message: { type: 'string' },
        },
        required: ['status'],
      },
      ...openApiComponentSchemas,
    },
    responses: {
      BadRequest: {
        description: 'Invalid request',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      Unauthorized: {
        description: 'Missing or invalid authentication',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
    },
  },
  paths: {
    '/security/public-key': {
      get: {
        tags: ['Security'],
        summary: 'Get RSA public key for encrypted sensitive fields',
        responses: {
          '200': {
            description: 'Public key',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { publicKey: { type: 'string' } },
                  required: ['publicKey'],
                },
              },
            },
          },
        },
      },
    },
    '/auth/verification-code': {
      post: {
        tags: ['Auth'],
        summary: 'Send registration verification code',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VerificationCodeRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Verification code sent' },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResetPasswordRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Registered user; auth_token and csrf_token cookies are set',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                  },
                  required: ['user'],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthPasswordRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Authenticated user; auth_token and csrf_token cookies are set' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out and revoke the current server-side session',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
        responses: {
          '204': { description: 'Logged out' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Current user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { $ref: '#/components/schemas/User' } },
                  required: ['user'],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/notes': {
      get: {
        tags: ['Notes'],
        summary: 'List notes',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Note summaries for current user; full note content is available from GET /notes/{id}',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    notes: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/NoteSummary' },
                    },
                  },
                  required: ['notes'],
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Notes'],
        summary: 'Create note',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/NoteInput' } } },
        },
        responses: {
          '201': { description: 'Created note' },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/notes/search': {
      get: {
        tags: ['Notes'],
        summary: 'Search notes with PostgreSQL search',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }],
        responses: { '200': { description: 'Search results' } },
      },
    },
    '/notes/{id}': {
      get: {
        tags: ['Notes'],
        summary: 'Get note',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Note' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Notes'],
        summary: 'Update note',
        security: [{ cookieAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/CsrfToken' },
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/NoteInput' } } },
        },
        responses: {
          '200': { description: 'Updated note' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Notes'],
        summary: 'Delete note',
        security: [{ cookieAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/CsrfToken' },
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '204': { description: 'Deleted' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/rag/ask': {
      post: {
        tags: ['RAG'],
        summary: 'Ask a question over the current user note knowledge base',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RagAskRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'RAG answer with citations and retrieval metadata',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    answer: { type: 'string' },
                    citations: { type: 'array', items: { $ref: '#/components/schemas/Citation' } },
                    conversationId: { type: 'integer' },
                    retrieval: { $ref: '#/components/schemas/RetrievalMetadata' },
                  },
                  required: ['answer', 'citations', 'conversationId', 'retrieval'],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/rag/reindex': {
      post: {
        tags: ['RAG'],
        summary: 'Reindex notes for retrieval',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
        responses: { '200': { description: 'Reindex count' } },
      },
    },
    '/rag/conversations': {
      get: {
        tags: ['RAG'],
        summary: 'List RAG conversations',
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'Conversations' } },
      },
    },
    '/llm/models': {
      get: {
        tags: ['LLM'],
        summary: 'List all available LLM models',
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'Available models' } },
      },
    },
    '/llm/keys': {
      get: {
        tags: ['LLM'],
        summary: 'List masked LLM provider keys',
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'Masked provider keys' } },
      },
      post: {
        tags: ['LLM'],
        summary: 'Save LLM provider key',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProviderKeyInput' } } },
        },
        responses: { '200': { description: 'Saved key' } },
      },
    },
    '/embedding/keys': {
      get: {
        tags: ['Embedding'],
        summary: 'List masked embedding provider keys',
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'Masked provider keys' } },
      },
      post: {
        tags: ['Embedding'],
        summary: 'Save embedding provider key',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProviderKeyInput' } } },
        },
        responses: { '200': { description: 'Saved key' } },
      },
    },
    '/attachments/notes/{noteId}/images': {
      post: {
        tags: ['Attachments'],
        summary: 'Upload note image attachment',
        security: [{ cookieAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/CsrfToken' },
          { name: 'noteId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { image: { type: 'string', format: 'binary' } },
                required: ['image'],
              },
            },
          },
        },
        responses: { '201': { description: 'Uploaded image' } },
      },
    },
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Liveness check',
        servers: [{ url: '' }],
        responses: { '200': { description: 'API process is alive' } },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness check for database and vector store',
        servers: [{ url: '' }],
        responses: { '200': { description: 'Ready or degraded' }, '503': { description: 'Not ready' } },
      },
    },
    '/metrics': {
      get: {
        tags: ['Health'],
        summary: 'Prometheus metrics',
        servers: [{ url: '' }],
        responses: { '200': { description: 'Prometheus text exposition' } },
      },
    },
  },
} as const;

export const swaggerHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AI Note Keeper API Docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    </script>
  </body>
</html>`;
