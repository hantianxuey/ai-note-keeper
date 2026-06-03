const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:4002',
  'http://127.0.0.1:4002',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export function getAllowedOrigins(env: Partial<Record<'FRONTEND_URL', string>> = process.env): string[] {
  return [...DEFAULT_ALLOWED_ORIGINS, env.FRONTEND_URL].filter(Boolean) as string[];
}

export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  return !origin || allowedOrigins.includes(origin);
}
