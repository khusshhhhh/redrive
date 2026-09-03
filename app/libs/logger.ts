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

function emit(level: Level, base: Fields, msg: string, fields?: Fields) {
  if (LEVELS[level] < MIN_LEVEL) return;

  const merged: Fields = { ...base, ...fields };
  if (merged.err !== undefined) merged.err = serialiseError(merged.err);

  if (process.env.NODE_ENV === "production") {
    process.stdout.write(
      JSON.stringify({ level, ts: new Date().toISOString(), msg, ...merged }) + "\n",
    );
    return;
  }

  const tag = level.toUpperCase().padEnd(5);
  const extras = Object.keys(merged).length ? " " + JSON.stringify(merged) : "";
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
    `${tag} ${msg}${extras}`,
  );
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
