import type { Logger, LogLevel } from 'homebridge';

export interface LogRecord {
  level: LogLevel | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  params: unknown[];
}

export interface CapturingLogger extends Logger {
  records: LogRecord[];
}

export function createCapturingLogger(): CapturingLogger {
  const records: LogRecord[] = [];
  const push =
    (level: LogRecord['level']) =>
    (message: string, ...params: unknown[]) => {
      records.push({ level, message, params });
    };
  const log: Partial<CapturingLogger> = {
    info: push('info'),
    warn: push('warn'),
    error: push('error'),
    debug: push('debug'),
    log: (level: LogLevel, message: string, ...params: unknown[]) => {
      records.push({ level, message, params });
    },
    records,
  };
  return log as CapturingLogger;
}
