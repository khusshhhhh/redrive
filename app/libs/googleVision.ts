type VisionResponse = {
  responses?: Array<{
    fullTextAnnotation?: {
      text?: string;
      pages?: Array<{ confidence?: number }>;
    };
    error?: { message?: string };
  }>;
};

export type OcrResult = {
  text: string;
  confidence: number;
};

export async function readLicenceImages(images: Buffer[]): Promise<OcrResult[]> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Licence OCR is not configured");
  }

  const response = await fetch("https://vision.googleapis.com/v1/images:annotate", {
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

  if (!response.ok) {
    throw new Error(`Licence OCR service returned ${response.status}`);
  }

  const body = await response.json() as VisionResponse;
  if (!body.responses || body.responses.length !== images.length) {
    throw new Error("Licence OCR returned an incomplete response");
  }

  return body.responses.map((item) => {
    if (item.error?.message) throw new Error("Licence OCR could not read an image");
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

