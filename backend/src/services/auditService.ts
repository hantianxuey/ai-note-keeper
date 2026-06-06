import crypto from 'crypto';
import { logger } from '../config/logger';
import { recordSecurityEvent } from '../observability/metrics';

type AuditOutcome = 'success' | 'failure';

type AuditEvent = {
  event: string;
  outcome: AuditOutcome;
  userId?: number;
  subject?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
};

const hashSubject = (subject: string): string =>
  crypto.createHash('sha256').update(subject.toLowerCase()).digest('hex').slice(0, 16);

export const recordAuditEvent = ({
  event,
  outcome,
  userId,
  subject,
  metadata,
}: AuditEvent): void => {
  recordSecurityEvent(event, outcome);
  logger.info({
    audit: true,
    event,
    outcome,
    userId,
    subjectHash: subject ? hashSubject(subject) : undefined,
    ...metadata,
  }, 'Security audit event');
};
