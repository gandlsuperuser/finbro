import { NextResponse } from "next/server";
import {
  buildPrompt,
  DEFAULT_QWEN_ENDPOINT,
  DEFAULT_QWEN_MODEL,
  SYSTEM_PROMPT,
  type ExplainMetricRequest,
} from "@/lib/ai/qwen";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: ExplainMetricRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const endpoint = (body.endpoint || DEFAULT_QWEN_ENDPOINT).replace(/\/$/, "");
  const model = body.model || DEFAULT_QWEN_MODEL;
  const userPrompt = buildPrompt(body);

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (body.history && Array.isArray(body.history)) {
    for (const h of body.history) {
      if (h.role && h.content) {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }

  messages.push({ role: "user", content: userPrompt });

  const encoder = new TextEncoder();

  try {
    const upstreamUrl = `${endpoint}/chat/completions`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.3,
        max_tokens: 1500,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      const errText = await upstreamRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: `Upstream Qwen endpoint returned ${upstreamRes.status}: ${errText}`,
        },
        { status: upstreamRes.status || 502 }
      );
    }

    const readable = new ReadableStream({
      async start(controller) {
        const reader = upstreamRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data:")) continue;

              const dataStr = trimmed.slice(5).trim();
              if (dataStr === "[DONE]") {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
                );
                continue;
              }

              try {
                const parsed = JSON.parse(dataStr);
                const choice = parsed.choices?.[0];
                if (!choice) continue;

                // Reasoning content (Qwen 3.5 MLX / DeepSeek style)
                if (choice.delta?.reasoning_content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "reasoning",
                        delta: choice.delta.reasoning_content,
                      })}\n\n`
                    )
                  );
                }

                // Regular answer content
                if (choice.delta?.content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "content",
                        delta: choice.delta.content,
                      })}\n\n`
                    )
                  );
                }
              } catch {
                // Ignore parse errors from partial JSON
              }
            }
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: message,
              })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to connect to Qwen model: ${message}` },
      { status: 500 }
    );
  }
}
