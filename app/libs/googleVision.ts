type VisionResponse = {
  responses?: Array<{
    fullTextAnnotation?: {
      text?: string;
      pages?: Array<{ confidence?: number }>;
    };
    error?: { message?: string };
  }>;
};

type GoogleErrorBody = {
  error?: {
    status?: string;
    message?: string;
    details?: Array<{ reason?: string }>;
  };
};

export type LicenceOcrFailureCode =
  | "OCR_CONFIGURATION_ERROR"
  | "OCR_SERVICE_DISABLED"
  | "OCR_PERMISSION_DENIED"
  | "OCR_RATE_LIMITED"
  | "OCR_PROVIDER_TIMEOUT"
  | "OCR_PROVIDER_ERROR"
  | "OCR_IMAGE_REJECTED";

export class LicenceOcrError extends Error {
  constructor(
    public readonly code: LicenceOcrFailureCode,
    message: string,
    public readonly providerStatus?: number,
    public readonly providerReason?: string,
  ) {
    super(message);
    this.name = "LicenceOcrError";
  }
}

export function classifyGoogleVisionFailure(status: number, body: GoogleErrorBody) {
  const providerReason = body.error?.details?.find((detail) => detail.reason)?.reason ||
    body.error?.status ||
    `HTTP_${status}`;
  let code: LicenceOcrFailureCode = "OCR_PROVIDER_ERROR";

  if (providerReason === "API_KEY_INVALID") code = "OCR_CONFIGURATION_ERROR";
  else if (providerReason === "SERVICE_DISABLED" || providerReason === "BILLING_DISABLED") code = "OCR_SERVICE_DISABLED";
  else if (status === 401 || status === 403) code = "OCR_PERMISSION_DENIED";
  else if (status === 429 || providerReason === "RESOURCE_EXHAUSTED") code = "OCR_RATE_LIMITED";

  return { code, providerReason };
}

export type OcrResult = {
  text: string;
  confidence: number;
};

export async function readLicenceImages(images: Buffer[]): Promise<OcrResult[]> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Licence OCR is not configured");
  }

  let response: Response;
  try {
    response = await fetch("https://vision.googleapis.com/v1/images:annotate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        requests: images.map((image) => ({
          image: { content: image.toString("base64") },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["en"] },
        })),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const timedOut = error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    throw new LicenceOcrError(
      timedOut ? "OCR_PROVIDER_TIMEOUT" : "OCR_PROVIDER_ERROR",
      timedOut ? "Licence OCR provider timed out" : "Licence OCR provider could not be reached",
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as GoogleErrorBody;
    const failure = classifyGoogleVisionFailure(response.status, errorBody);
    throw new LicenceOcrError(
      failure.code,
      "Licence OCR provider rejected the request",
      response.status,
      failure.providerReason,
    );
  }

  const body = await response.json() as VisionResponse;
  if (!body.responses || body.responses.length !== images.length) {
    throw new Error("Licence OCR returned an incomplete response");
  }

  return body.responses.map((item) => {
    if (item.error?.message) {
      throw new LicenceOcrError(
        "OCR_IMAGE_REJECTED",
        "Licence OCR could not read an image",
      );
    }
    const pages = item.fullTextAnnotation?.pages || [];
    const confidence = pages.length
      ? pages.reduce((total, page) => total + (page.confidence || 0), 0) / pages.length
      : 0;
    return {
      text: item.fullTextAnnotation?.text?.trim() || "",
      confidence,
    };
  });
}

