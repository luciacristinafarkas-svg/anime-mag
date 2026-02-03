import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { theme, answers } = await req.json();

    // 1) ENV checks (ca sa nu mai fie silent)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
    }
    if (!supabaseService) {
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }
    if (!openaiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseService);

    // 2) Insert into issues
    const { data: issue, error: insertError } = await supabaseAdmin
      .from("issues")
      .insert({ theme: theme ?? "romance", answers: answers ?? {} })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Supabase insert failed", details: insertError },
        { status: 500 }
      );
    }

// 3) Generate story (OpenAI OR fallback)
let story: string;

try {
  const client = new OpenAI({ apiKey: openaiKey });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content:
          "Return ONLY valid JSON (no markdown) with keys: title, logline, scenes (array of 6 short scenes). Inputs: " +
          JSON.stringify(answers ?? {}),
      },
    ],
  });

  story = completion.choices[0].message.content ?? "";
} catch (e) {
  // 🔴 FALLBACK când OpenAI dă 429 / no money
  story = JSON.stringify({
    title: "Fallback Anime Story",
    logline: "A love story generated without AI, but with heart.",
    scenes: [
      "They meet by chance on an ordinary day.",
      "A small detail catches one’s attention.",
      "An unexpected conversation brings them closer.",
      "A quiet moment reveals hidden feelings.",
      "One honest sentence changes everything.",
      "They walk forward together, uncertain but hopeful."
    ]
  });
}


    // 4) Save story_bible
    const { error: updateError } = await supabaseAdmin
      .from("issues")
      .update({ story_bible: story, status: "draft" })
      .eq("id", issue.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Supabase update failed", details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json({ issueId: issue.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Unhandled exception", message: err?.message, stack: err?.stack },
      { status: 500 }
    );
  }
}
