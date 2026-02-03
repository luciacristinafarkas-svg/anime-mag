"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Story = {
  title: string;
  logline: string;
  scenes: string[];
};

export default function IssuePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<Story | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("issues")
        .select("id, story_bible")
        .eq("id", id)
        .single();

      if (error) {
        setStory(null);
        setLoading(false);
        return;
      }

      const raw = data?.story_bible;

      // story_bible may be stringified JSON or jsonb
      const parsed =
        typeof raw === "string" ? (JSON.parse(raw) as Story) : (raw as Story);

      setStory(parsed);
      setLoading(false);
      setPage(1);
    })();
  }, [id]);

  const panelsPerPage = 2;

  const totalPages = useMemo(() => {
    const n = story?.scenes?.length ?? 0;
    return Math.max(1, Math.ceil(n / panelsPerPage));
  }, [story]);

  const pagePanels = useMemo(() => {
    if (!story) return [];
    const start = (page - 1) * panelsPerPage;
    return story.scenes.slice(start, start + panelsPerPage);
  }, [story, page]);

  function prev() {
    setPage((p) => Math.max(1, p - 1));
  }
  function next() {
    setPage((p) => Math.min(totalPages, p + 1));
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 980, margin: "40px auto", padding: 16 }}>
        <h1>Loading…</h1>
      </main>
    );
  }

  if (!story) {
    return (
      <main style={{ maxWidth: 980, margin: "40px auto", padding: 16 }}>
        <h1>Not found</h1>
        <p>Could not load this issue.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 980, margin: "40px auto", padding: 16 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>{story.title}</h1>
          <p style={{ margin: "8px 0 0", opacity: 0.75, fontStyle: "italic" }}>
            {story.logline}
          </p>
        </div>

        {/* Pager */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={prev} disabled={page === 1}>
            ◀ Prev
          </button>
          <span style={{ opacity: 0.75 }}>
            Page <b>{page}</b> / {totalPages}
          </span>
          <button onClick={next} disabled={page === totalPages}>
            Next ▶
          </button>
        </div>
      </div>

      {/* “Manga page” sheet */}
      <div
        style={{
          marginTop: 24,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 18,
          padding: 18,
          background: "white",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            opacity: 0.6,
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          <span>Issue #{String(id).slice(0, 6)}</span>
          <span>Page {page}</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 16,
          }}
        >
          {pagePanels.map((scene, idx) => {
            const panelNumber = (page - 1) * panelsPerPage + idx + 1;
            return (
              <div
                key={panelNumber}
                style={{
                  border: "1px solid rgba(0,0,0,0.10)",
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid rgba(0,0,0,0.08)",
                    background: "rgba(0,0,0,0.02)",
                  }}
                >
                  <b>Panel {panelNumber}</b>
                  <span style={{ opacity: 0.6 }}>Frame</span>
                </div>

                {/* Image placeholder */}
                <div
                  style={{
                    height: 320,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderBottom: "1px solid rgba(0,0,0,0.08)",
                    background:
                      "repeating-linear-gradient(45deg, rgba(0,0,0,0.03), rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.01) 10px, rgba(0,0,0,0.01) 20px)",
                  }}
                >
                  <span style={{ opacity: 0.6 }}>(image placeholder)</span>
                </div>

                {/* Caption / bubble */}
                <div style={{ padding: 14 }}>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "10px 12px",
                      borderRadius: 14,
                      background: "rgba(0,0,0,0.05)",
                      lineHeight: 1.45,
                    }}
                  >
                    {scene}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom pager (nice on mobile) */}
      <div
        style={{
          marginTop: 18,
          display: "flex",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <button onClick={prev} disabled={page === 1}>
          ◀ Prev
        </button>
        <button onClick={next} disabled={page === totalPages}>
          Next ▶
        </button>
      </div>
    </main>
  );
}
