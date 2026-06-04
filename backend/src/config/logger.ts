import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'ai-note-keeper-api',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
