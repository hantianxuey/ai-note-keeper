import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  register: metricsRegistry,
  prefix: 'ai_note_keeper_',
});

export const httpRequestsTotal = new Counter({
  name: 'ai_note_keeper_http_requests_total',
  help: 'Total HTTP requests by method, route, and status code.',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [metricsRegistry],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'ai_note_keeper_http_request_duration_seconds',
  help: 'HTTP request duration in seconds by method, route, and status code.',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry],
});

export const ragRetrievalDurationSeconds = new Histogram({
  name: 'ai_note_keeper_rag_retrieval_duration_seconds',
  help: 'RAG retrieval duration in seconds by provider and final status.',
  labelNames: ['provider', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry],
});

export const ragRetrievalResultsTotal = new Counter({
  name: 'ai_note_keeper_rag_retrieval_results_total',
  help: 'RAG retrieval result count by source and provider.',
  labelNames: ['provider', 'source'] as const,
  registers: [metricsRegistry],
});

export const ragRetrievalTopScore = new Gauge({
  name: 'ai_note_keeper_rag_retrieval_top_score',
  help: 'Most recent top retrieval score by source and provider.',
  labelNames: ['provider', 'source'] as const,
  registers: [metricsRegistry],
});

export const securityEventsTotal = new Counter({
  name: 'ai_note_keeper_security_events_total',
  help: 'Security and audit events by event name and outcome.',
  labelNames: ['event', 'outcome'] as const,
  registers: [metricsRegistry],
});

export const routeLabelForMetrics = (path: string) => {
  const withoutQuery = path.split('?')[0] || '/';
  const normalized = withoutQuery
    .split('/')
    .map((segment) => (/^\d+$/.test(segment) ? ':id' : segment))
    .join('/');

  return normalized || '/';
};

export const recordHttpRequest = (
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number
) => {
  const labels = {
    method,
    route,
    status_code: String(statusCode),
  };

  httpRequestsTotal.inc(labels);
  httpRequestDurationSeconds.observe(labels, durationSeconds);
};

export type RagRetrievalSource = 'vector' | 'fulltext' | 'ilike' | 'keyword' | 'none';

export const recordRagRetrieval = (
  provider: string,
  status: 'ok' | 'empty' | 'error',
  durationSeconds: number,
  sourceCounts: Partial<Record<RagRetrievalSource, number>>,
  topScores: Partial<Record<RagRetrievalSource, number>>
) => {
  ragRetrievalDurationSeconds.observe({ provider, status }, durationSeconds);

  for (const [source, count] of Object.entries(sourceCounts)) {
    if (count > 0) {
      ragRetrievalResultsTotal.inc({ provider, source }, count);
    }
  }

  for (const [source, score] of Object.entries(topScores)) {
    if (score !== undefined && Number.isFinite(score)) {
      ragRetrievalTopScore.set({ provider, source }, score);
    }
  }
};

export const recordSecurityEvent = (
  event: string,
  outcome: 'success' | 'failure'
) => {
  securityEventsTotal.inc({ event, outcome });
};
