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

    // 1) Load issue story
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

    const scenes = Array.isArray(story?.scenes) ? story.scenes.slice(0, 6) : [];
    if (scenes.length === 0) {
      return NextResponse.json({ error: "No scenes to render" }, { status: 400 });
    }

    // 2) Ensure panels exist
    const { data: existingPanels, error: panelsErr } = await supabaseAdmin
      .from("panels")
      .select("id,page,panel,caption,image_url")
      .eq("issue_id", issueId)
      .order("page", { ascending: true })
      .order("panel", { ascending: true });

    if (panelsErr) {
      return NextResponse.json({ error: "Failed to load panels", details: panelsErr }, { status: 500 });
    }

    let panels = (existingPanels ?? []) as any[];

    if (panels.length === 0) {
      const rows = scenes.map((caption, i) => ({
        issue_id: issueId,
        page: Math.floor(i / 2) + 1,
        panel: (i % 2) + 1,
        caption,
        image_prompt:
          `Black and white manga panel, high-contrast ink, screentone shading, ` +
          `cinematic framing, no text, no watermark. Scene: ${caption}`,
        image_url: null,
      }));

      const { error: insErr } = await supabaseAdmin.from("panels").insert(rows);
      if (insErr) {
        return NextResponse.json({ error: "Insert panels failed", details: insErr }, { status: 500 });
      }

      // reload
      const { data: reloaded } = await supabaseAdmin
        .from("panels")
        .select("id,page,panel,caption,image_url")
        .eq("issue_id", issueId)
        .order("page", { ascending: true })
        .order("panel", { ascending: true });

      panels = (reloaded ?? []) as any[];
    }

    // 3) Generate images only for missing ones
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey: key });

    const toGen = panels.filter((p) => !p.image_url);
    for (const p of toGen) {
      const prompt =
        `Black and white manga panel, high-contrast ink, screentone shading, ` +
        `cinematic framing, no text, no watermark. Scene: ${p.caption}`;

      try {
        const img = await client.images.generate({
          model: "gpt-image-1",
          prompt,
          size: "1024x1024",
        });

        const b64 = img.data?.[0]?.b64_json;
        const image_url = b64 ? `data:image/png;base64,${b64}` : null;

        await supabaseAdmin
          .from("panels")
          .update({ image_url, image_prompt: prompt })
          .eq("id", p.id);

      } catch (e: any) {
        console.error("OpenAI image gen failed", {
          panelId: p.id,
          status: e?.status,
          message: e?.message,
          code: e?.code,
        });
        // keep null, move on
      }
    }

    // 4) Return current panels (with images if any)
    const { data: finalPanels, error: finalErr } = await supabaseAdmin
      .from("panels")
      .select("id,page,panel,caption,image_url")
      .eq("issue_id", issueId)
      .order("page", { ascending: true })
      .order("panel", { ascending: true });

    if (finalErr) {
      return NextResponse.json({ error: "Failed to reload panels", details: finalErr }, { status: 500 });
    }

    return NextResponse.json(finalPanels ?? []);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Unhandled exception", message: err?.message },
      { status: 500 }
    );
  }
}
