import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const { theme, answers } = await req.json();

  const { data: issue } = await supabaseAdmin
    .from("issues")
    .insert({ theme, answers })
    .select("id")
    .single();

  const prompt = `
Transform answers into a short anime-style story outline.
Return JSON with title and 6 short scenes.
Answers: ${JSON.stringify(answers)}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  await supabaseAdmin
    .from("issues")
    .update({ story_bible: completion.choices[0].message.content })
    .eq("id", issue.id);

  return NextResponse.json({ issueId: issue.id });
}
