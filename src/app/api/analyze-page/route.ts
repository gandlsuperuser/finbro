import { NextResponse } from "next/server";
import { nvidiaQ3FY26 } from "@/data/fixtures/nvidiaQ3FY26";
import type { AnalyzePageResponse } from "@/types/finance";

export const runtime = "nodejs";

/**
 * POST { image: "data:image/jpeg;base64,..." }
 * Returns structured entities with normalized, upright bboxes.
 *
 * Integration point: set VISION_ENDPOINT to forward the frame to a real
 * OCR + LLM pipeline that returns a `RecognizedPage`. Without it (or on failure)
 * we fall back to deterministic fixtures for offline development.
 */
export async function POST(req: Request) {
  const started = Date.now();
  let image: string | undefined;
  try {
    ({ image } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!image || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Expected base64 data URL in `image`" }, { status: 400 });
  }

  const endpoint = process.env.VISION_ENDPOINT;
  if (endpoint) {
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${process.env.VISION_API_KEY ?? ""}` },
        body: JSON.stringify({ image }),
        signal: AbortSignal.timeout(12_000),
      });
      if (r.ok) {
        const page = await r.json();
        return NextResponse.json<AnalyzePageResponse>({ page: { ...page, source: "vision" }, latencyMs: Date.now() - started });
      }
    } catch {
      /* fall through to mock */
    }
  }

  await new Promise((res) => setTimeout(res, 450)); // simulate inference latency
  return NextResponse.json<AnalyzePageResponse>({ page: nvidiaQ3FY26, latencyMs: Date.now() - started });
}
