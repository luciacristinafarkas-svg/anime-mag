"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const QUESTIONS = [
  ["how_met", "Unde v-ați întâlnit prima dată?"],
  ["detail", "Ce detaliu mic îți amintești cel mai clar?"],
  ["first_feel", "Ce ai simțit atunci (1–2 cuvinte)?"],
  ["bond", "Ce v-a apropiat?"],
  ["small_scene", "O scenă mică dar importantă din început."],
  ["quote", "O replică reală care a rămas."],
  ["conflict", "Primul conflict real (despre ce era, de fapt)?"],
  ["unsaid", "Ce nu ai spus atunci?"],
  ["change", "Ce ai făcut diferit decât de obicei?"],
  ["evolution", "Cum s-a schimbat relația în timp?"],
  ["ending", "Finalul: împreună / despărțiți / incert?"],
  ["lesson", "Lecția într-o propoziție."]
];

export default function CreatePage() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit() {
    setLoading(true);

   const res = await fetch("/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
body: JSON.stringify({ theme: "romance", answers }),
});

const data = await res.json();

if (!res.ok) {
  alert(data.error ?? "Generation failed");
  setLoading(false);
  return;
}

router.push(`/issue/${data.issueId}`);

  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Create your anime story</h1>

      {QUESTIONS.map(([key, label]) => (
        <div key={key} style={{ marginTop: 16 }}>
          <b>{label}</b>
          <textarea
            rows={3}
            style={{ width: "100%" }}
            onChange={(e) =>
              setAnswers((a) => ({ ...a, [key]: e.target.value }))
            }
          />
        </div>
      ))}

      <button onClick={submit} disabled={loading} style={{ marginTop: 24 }}>
        {loading ? "Generating…" : "Generate"}
      </button>
    </main>
  );
}
