import { supabase } from "@/lib/supabase";

export default async function IssuePage({ params }: { params: { id: string } }) {
  const { data } = await supabase
    .from("issues")
    .select("*")
    .eq("id", params.id)
    .single();

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Your Anime Story</h1>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(data?.story_bible, null, 2)}
      </pre>
    </main>
  );
}
