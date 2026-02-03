import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { theme, answers } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing" },
        { status: 500 }
      );
    }

    // 1. Insert issue
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

    // 2. Call OpenAI (VERY simple)
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: "Write a 3-sentence anime-style love story.",
        },
      ],
    });

    // 3. Update issue
    const { error: updateError } = await supabaseAdmin
      .from("issues")
      .update({
        story_bible: completion.choices[0].message.content,
      })
      .eq("id", issue.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Supabase update failed", details: updateError },
        { status: 500 }
      );
    }

    // 4. Success
    return NextResponse.json({ issueId: issue.id });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Unhandled exception",
        message: err?.message,
        stack: err?.stack,
      },
      { status: 500 }
    );
  }
}
