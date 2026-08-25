import crypto from "crypto";
import { Prisma } from "@prisma/client";

import prisma from "@/app/libs/prismadb";
import { mobileError, mobileJson, mobileRequestId } from "@/app/libs/mobile-api/responses";

type IdempotentResult = { status: number; body: unknown };

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

function correlateError(body: unknown, request: Request): Prisma.InputJsonValue {
  if (!body || Array.isArray(body) || typeof body !== "object") return body as Prisma.InputJsonValue;
  const record = body as Record<string, unknown>;
  const error = record.error;
  if (!error || Array.isArray(error) || typeof error !== "object") return body;
  return { ...record, error: { ...error, requestId: mobileRequestId(request) } } as Prisma.InputJsonValue;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

export async function executeIdempotent(input: {
  request: Request;
  actorUserId: string;
  scope: string;
  payload: unknown;
  handler: () => Promise<IdempotentResult>;
}) {
  const key = input.request.headers.get("idempotency-key")?.trim();
  if (!key || key.length < 8 || key.length > 200 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    return mobileError(input.request, 400, "IDEMPOTENCY_KEY_REQUIRED", "Provide a valid Idempotency-Key header.");
  }

  const keyHash = sha256(key);
  const fingerprint = sha256(`${input.actorUserId}|${input.scope}|${keyHash}`);
  const requestHash = sha256(JSON.stringify(stableValue(input.payload)));
  const existing = await prisma.idempotencyRecord.findUnique({ where: { fingerprint } });

  if (existing) {
    if (existing.requestHash !== requestHash) {
      return mobileError(input.request, 409, "IDEMPOTENCY_KEY_REUSED", "That idempotency key was already used for a different request.");
    }
    if (existing.status === 0 || existing.response === null) {
      return mobileError(input.request, 409, "REQUEST_IN_PROGRESS", "The original request is still being processed.", undefined, { "Retry-After": "2" });
    }
    return mobileJson(input.request, correlateError(existing.response, input.request), existing.status, { "Idempotency-Replayed": "true" });
  }

  try {
    await prisma.idempotencyRecord.create({
      data: {
        fingerprint,
        actorUserId: input.actorUserId,
        scope: input.scope,
        keyHash,
        requestHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return mobileError(input.request, 409, "REQUEST_IN_PROGRESS", "The original request is still being processed.", undefined, { "Retry-After": "2" });
    }
    throw error;
  }

  try {
    const result = await input.handler();
    const responseBody = correlateError(result.body, input.request);
    await prisma.idempotencyRecord.update({
      where: { fingerprint },
      data: { status: result.status, response: responseBody },
    });
    return mobileJson(input.request, responseBody, result.status);
  } catch (error) {
    await prisma.idempotencyRecord.delete({ where: { fingerprint } }).catch(() => undefined);
    throw error;
  }
}
