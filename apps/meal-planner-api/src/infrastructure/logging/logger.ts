type Level = 'debug' | 'info' | 'warn' | 'error';
type LogLevel = Level | 'silent';

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

export type Logger = {
  [K in Level]: (message: string, context?: Record<string, unknown>) => void;
};

/** Structured JSON logs (one line per event) so CloudWatch can query fields. */
export function createLogger(level: LogLevel = 'info'): Logger {
  const log =
    (messageLevel: Level) =>
    (message: string, context: Record<string, unknown> = {}) => {
      if (ORDER[messageLevel] < ORDER[level]) return;
      const line = JSON.stringify({ level: messageLevel, message, time: new Date().toISOString(), ...context });
      (messageLevel === 'error' ? console.error : console.log)(line);
    };
  return { debug: log('debug'), info: log('info'), warn: log('warn'), error: log('error') };
}
