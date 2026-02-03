import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // IMPORTANT: nu Edge

export async function POST(req: Request) {
  try {
    const { theme, answers } = await req.json();

    // --- ENV checks (ca sa NU mai crape silent)
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

    // Create supabase admin client INSIDE handler (nu la import time)
    const supabaseAdmin = createClient(supabaseUrl, supabaseService);

    // 1) Insert issue
    const { data: issue, error: insertError } = await supabaseAdmin
      .from("issues")
      .insert({ theme, answers })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Supabase insert failed", details: insertError },
        { status: 500 }
      );
    }

    // 2) OpenAI call
    const client = new OpenAI({ apiKey: openaiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: "Write a 3-sentence anime-style love story." }
      ],
    });

    // 3) Update issue
    const { error: updateError } = await supabaseAdmin
      .from("issues")
      .update({ story_bible: completion.choices[0].message.content })
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
