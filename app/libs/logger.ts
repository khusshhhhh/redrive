// Minimal structured logger — zero dependencies, works in the Node and Edge
// runtimes and in plain test processes.
//
// Production emits one JSON object per line (Vercel / Datadog / Axiom ingest
// these directly). Development prints a compact readable line. Attach a
// per-request id with `logger.child({ requestId })` so a request's lines can be
// correlated in the log sink.

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const MIN_LEVEL: number =
  LEVELS[(process.env.LOG_LEVEL as Level) ?? (process.env.NODE_ENV === "production" ? "info" : "debug")] ??
  LEVELS.info;

type Fields = Record<string, unknown>;

function serialiseError(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

const consoleFor = (level: Level) =>
  level === "error" ? console.error : level === "warn" ? console.warn : console.log;

// `process.stdout` only exists in the Node runtime. Middleware, the edge
// instrumentation hook and edge route handlers run on the Edge runtime, where
// it's undefined — writing to it there throws and (from `register()`) takes the
// whole middleware down. Fall back to `console`, which the platform still
// captures as a log line.
const stdoutWrite: ((chunk: string) => void) | null =
  typeof process !== "undefined" && typeof process.stdout?.write === "function"
    ? (chunk) => process.stdout.write(chunk)
    : null;

function emit(level: Level, base: Fields, msg: string, fields?: Fields) {
  if (LEVELS[level] < MIN_LEVEL) return;

  const merged: Fields = { ...base, ...fields };
  if (merged.err !== undefined) merged.err = serialiseError(merged.err);

  if (process.env.NODE_ENV === "production") {
    const line = JSON.stringify({ level, ts: new Date().toISOString(), msg, ...merged });
    if (stdoutWrite) stdoutWrite(line + "\n");
    else consoleFor(level)(line);
    return;
  }

  const tag = level.toUpperCase().padEnd(5);
  const extras = Object.keys(merged).length ? " " + JSON.stringify(merged) : "";
  consoleFor(level)(`${tag} ${msg}${extras}`);
}

export interface Logger {
  debug(msg: string, fields?: Fields): void;
  info(msg: string, fields?: Fields): void;
  warn(msg: string, fields?: Fields): void;
  error(msg: string, fields?: Fields): void;
  child(fields: Fields): Logger;
}

function make(base: Fields): Logger {
  return {
    debug: (msg, fields) => emit("debug", base, msg, fields),
    info: (msg, fields) => emit("info", base, msg, fields),
    warn: (msg, fields) => emit("warn", base, msg, fields),
    error: (msg, fields) => emit("error", base, msg, fields),
    child: (fields) => make({ ...base, ...fields }),
  };
}

export const logger: Logger = make({});
