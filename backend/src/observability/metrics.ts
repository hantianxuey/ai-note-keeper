import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

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
