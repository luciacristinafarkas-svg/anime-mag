import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function GET() {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey: key });

    const img = await client.images.generate({
      model: "gpt-image-1",
      prompt: "black and white manga panel, ink, screentone, no text",
      size: "1024x1024",
    });

    const b64 = img.data?.[0]?.b64_json;
    return NextResponse.json({ ok: true, hasImage: !!b64 }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message, status: e?.status, code: e?.code },
      { status: 500 }
    );
  }
}
