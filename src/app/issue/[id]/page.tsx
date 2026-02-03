import { supabase } from "@/lib/supabase";

export default async function IssuePage({ params }: { params: { id: string } }) {
  const { data } = await supabase
    .from("issues")
    .select("*")
    .eq("id", params.id)
    .single();

const story =
  typeof data?.story_bible === "string"
    ? JSON.parse(data.story_bible)
    : data?.story_bible;

return (
  <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
    <h1>{story.title}</h1>
    <p style={{ fontStyle: "italic", opacity: 0.8 }}>{story.logline}</p>

    <ol>
      {story.scenes.map((scene: string, i: number) => (
        <li key={i} style={{ marginTop: 12 }}>
          {scene}
        </li>
      ))}
    </ol>
  </main>
);

}
