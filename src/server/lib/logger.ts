import pino, { type Logger } from 'pino';

export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export type { Logger };

export function createLogger(level: LogLevel): Logger {
  return pino({ level });
}
