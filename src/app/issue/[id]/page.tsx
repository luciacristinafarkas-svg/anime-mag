"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Story = {
  title: string;
  logline: string;
  scenes: string[];
};

type PanelRow = {
  id: string;
  page: number;
  panel: number;
  caption: string | null;
  image_url: string | null;
};

export default function IssuePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<Story | null>(null);

  const [page, setPage] = useState(1);
  const panelsPerPage = 2;

  // Panels din DB (pt imagini)
  const [panels, setPanels] = useState<PanelRow[]>([]);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  // Page-flip drag
  const [dragging, setDragging] = useState(false);
  const [dragP, setDragP] = useState(0); // 0..1
  const startX = useRef<number | null>(null);

  // Animatie swap page (simple)
  const [pageKey, setPageKey] = useState(0);

  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("issues")
        .select("id, story_bible")
        .eq("id", id)
        .single();

      if (error || !data) {
        setStory(null);
        setLoading(false);
        return;
      }

      const raw = data.story_bible;
      const parsed =
        typeof raw === "string" ? (JSON.parse(raw) as Story) : (raw as Story);

      // safety
      parsed.scenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];

      setStory(parsed);
      setPage(1);
      setLoading(false);
    })();
  }, [id]);

  // load panels (imagini) din DB
  useEffect(() => {
    if (!id) return;

    (async () => {
      const { data } = await supabase
        .from("panels")
        .select("id,page,panel,caption,image_url")
        .eq("issue_id", id)
        .order("page", { ascending: true })
        .order("panel", { ascending: true });

      setPanels((data ?? []) as PanelRow[]);
    })();
  }, [id, rendering]);

  const totalPages = useMemo(() => {
    const n = story?.scenes?.length ?? 0;
    return Math.max(1, Math.ceil(n / panelsPerPage));
  }, [story]);

  const pagePanelsText = useMemo(() => {
    if (!story) return [];
    const start = (page - 1) * panelsPerPage;
    return story.scenes.slice(start, start + panelsPerPage);
  }, [story, page]);

  // Dacă ai panels din DB, preferă-le (când există)
  const pagePanelsFromDb = useMemo(() => {
    return panels.filter((p) => p.page === page).sort((a, b) => a.panel - b.panel);
  }, [panels, page]);

  function prev() {
    setPage((p) => {
      const np = Math.max(1, p - 1);
      setPageKey((k) => k + 1);
      return np;
    });
  }

  function next() {
    setPage((p) => {
      const np = Math.min(totalPages, p + 1);
      setPageKey((k) => k + 1);
      return np;
    });
  }

  // Manga: NEXT cu drag din colț stânga-jos
  function onPointerDown(e: React.PointerEvent) {
    if (page >= totalPages) return;
    setDragging(true);
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || startX.current == null) return;
    const dx = e.clientX - startX.current; // tragi spre dreapta
    const p = Math.min(1, Math.max(0, dx / 260));
    setDragP(p);
  }

  function endDrag() {
    if (!dragging) return;
    setDragging(false);

    // threshold
    if (dragP > 0.45) {
      setDragP(0);
      next();
      return;
    }
    setDragP(0);
  }

  async function generateImages() {
    if (!id) return;

    setRendering(true);
    setRenderProgress(0);

    // UX simplu: progres fake + call server
    const t = setInterval(() => {
      setRenderProgress((p) => Math.min(0.9, p + 0.06));
    }, 240);

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId: id }),
      });

      await res.json().catch(() => ({}));
      setRenderProgress(1);
      setTimeout(() => setRendering(false), 450);
    } finally {
      clearInterval(t);
    }
  }

  if (loading) {
    return (
      <main className="manga-wrap">
        <div className="manga-header">
          <h1>Loading…</h1>
        </div>
      </main>
    );
  }

  if (!story) {
    return (
      <main className="manga-wrap">
        <div className="manga-header">
          <h1>Not found</h1>
          <p>Could not load this issue.</p>
        </div>
      </main>
    );
  }

  const useDbPanels = pagePanelsFromDb.length > 0;

  return (
    <main className="manga-wrap">
      {/* Header */}
      <div className="manga-header">
        <div>
          <h1 className="manga-title">{story.title}</h1>
          <p className="manga-logline">{story.logline}</p>
        </div>

        <div className="manga-actions">
          <button className="btn" onClick={generateImages} disabled={rendering}>
            {rendering ? "Rendering…" : "Generate images"}
          </button>
        </div>
      </div>

      {/* Sheet */}
      <div className="sheet" style={{ direction: "rtl" }}>
        <div className="sheet-meta">
          <span>Issue #{String(id).slice(0, 6)}</span>
          <span>Page {page}</span>
        </div>

        {/* Page flip overlay (animat de drag) */}
        <div
          className="flipOverlay"
          style={{
            opacity: dragging ? 1 : 0,
            transform: `translateX(${(1 - dragP) * 18}px) rotateY(${(1 - dragP) * 55}deg)`,
          }}
        />

        {/* Corner handle */}
        <div
          className={`corner ${page >= totalPages ? "cornerDisabled" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />

        <div key={pageKey} className="page">
          {(useDbPanels ? pagePanelsFromDb : pagePanelsText.map((t, i) => ({
            id: `tmp-${i}`,
            page,
            panel: i + 1,
            caption: t,
            image_url: null,
          }))).map((p, idx) => {
            const panelNumber = (page - 1) * panelsPerPage + idx + 1;
            return (
              <section key={p.id} className="panel">
                <div className="panelTop">
                  <b>Panel {panelNumber}</b>
                  <span>Frame</span>
                </div>

                <div className="panelImg">
                  {p.image_url ? (
                    // dacă salvezi base64/dataURL sau URL public
                    <img src={p.image_url} alt={`Panel ${panelNumber}`} />
                  ) : (
                    <div className="placeholder">(image placeholder)</div>
                  )}
                </div>

                <div className="panelCaption">
                  <span className="bubble">{p.caption ?? ""}</span>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Pager jos (în manga “Next” e pe stânga) */}
      <div className="pager">
        <button className="btn" onClick={next} disabled={page === totalPages}>
          ◀ Next
        </button>

        <span className="pagerText">
          Page <b>{page}</b> / {totalPages}
        </span>

        <button className="btn" onClick={prev} disabled={page === 1}>
          Prev ▶
        </button>
      </div>

      {/* Loading overlay pt “generate all 6 behind screen” */}
      {rendering && (
        <div className="renderOverlay">
          <div className="renderCard">
            <div className="renderTitle">Rendering panels…</div>
            <div className="renderBar">
              <div className="renderFill" style={{ width: `${renderProgress * 100}%` }} />
            </div>
            <div className="renderHint">
              Tip: în manga, tragi colțul stânga-jos ca să dai pagina.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
