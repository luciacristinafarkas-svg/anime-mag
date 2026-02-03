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
  <main style={{ maxWidth: 980, margin: "40px auto", padding: 16 }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
      <h1 style={{ margin: 0 }}>{story.title}</h1>
      <span style={{ opacity: 0.6 }}>Issue #{params.id.slice(0, 6)}</span>
    </div>

    <p style={{ fontStyle: "italic", opacity: 0.85, marginTop: 10 }}>
      {story.logline}
    </p>

    <div
      style={{
        marginTop: 24,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 16,
      }}
    >
      {story.scenes.map((scene: string, i: number) => (
        <div
          key={i}
          style={{
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 16,
            padding: 16,
            background: "white",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <b>Panel {i + 1}</b>
            <span style={{ opacity: 0.6 }}>Page {Math.floor(i / 2) + 1}</span>
          </div>

          {/* “frame” placeholder (later we’ll put images here) */}
          <div
            style={{
              marginTop: 12,
              height: 180,
              borderRadius: 12,
              border: "1px dashed rgba(0,0,0,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(0,0,0,0.55)",
              fontSize: 14,
            }}
          >
            (image placeholder)
          </div>

          {/* speech bubble */}
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              background: "rgba(0,0,0,0.04)",
              lineHeight: 1.45,
            }}
          >
            {scene}
          </div>
        </div>
      ))}
    </div>
  </main>
);


}
