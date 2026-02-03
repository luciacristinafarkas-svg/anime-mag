import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type Story = { title: string; logline: string; scenes: string[] };

export async function POST(req: Request) {
  try {
    const { issueId } = await req.json();

    if (!issueId) {
      return NextResponse.json({ error: "Missing issueId" }, { status: 400 });
    }

    // 1) Load issue + story
    const { data: issue, error: issueErr } = await supabaseAdmin
      .from("issues")
      .select("id, story_bible")
      .eq("id", issueId)
      .single();

    if (issueErr || !issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    const raw = issue.story_bible as any;
    const story: Story =
      typeof raw === "string" ? (JSON.parse(raw) as Story) : (raw as Story);

    const scenes = Array.isArray(story?.scenes) ? story.scenes : [];
    if (scenes.length === 0) {
      return NextResponse.json({ error: "No scenes to render" }, { status: 400 });
    }

    // 2) If panels already exist, don't duplicate
    const { data: existing } = await supabaseAdmin
      .from("panels")
      .select("id")
      .eq("issue_id", issueId)
      .limit(1);

    if ((existing ?? []).length > 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const client = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

    // 3) Create panels (and optionally generate images)
    const rows: any[] = [];

    for (let i = 0; i < Math.min(6, scenes.length); i++) {
      const page = Math.floor(i / 2) + 1;
      const panel = (i % 2) + 1;
      const caption = scenes[i];

      const imagePrompt =
        `Black and white manga panel, high-contrast ink, screentone shading, ` +
        `cinematic framing, no text, no watermark. Scene: ${caption}`;

      let image_url: string | null = null;

      // optional: generate image if key works
      if (client) {
        try {
          // If your account has quota, this will return an image.
          // If not, it will throw; we fall back to null.
          const img = await client.images.generate({
            model: "gpt-image-1",
            prompt: imagePrompt,
            size: "1024x1024",
          });

          // store as data URL (MVP)
          const b64 = img.data?.[0]?.b64_json;
          if (b64) image_url = `data:image/png;base64,${b64}`;
        } catch {
          image_url = null;
        }
      }

      rows.push({
        issue_id: issueId,
        page,
        panel,
        caption,
        image_prompt: imagePrompt,
        image_url,
      });
    }

    const { error: insErr } = await supabaseAdmin.from("panels").insert(rows);
    if (insErr) {
      return NextResponse.json({ error: "Insert panels failed", details: insErr }, { status: 500 });
    }

    return NextResponse.json({ ok: true, generated: true, count: rows.length });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Unhandled exception", message: err?.message },
      { status: 500 }
    );
  }
}
