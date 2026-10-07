"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { FormData } from "@/lib/phases";
import { C, btn, input } from "./styles";

/** Dados reais dos concorrentes: busca no Google Places ou texto colado. Alimenta {realData}. */
export function RealDataPanel({ formData, onChange, placesEnabled, clientId }: {
  formData: FormData; onChange: (v: string) => void; placesEnabled: boolean; clientId: string | null;
}) {
  const defaultQuery = formData.vertical && formData.city ? `${formData.vertical} em ${formData.city}` : "";
  const [query, setQuery] = useState(defaultQuery);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  const search = async () => {
    setState("loading"); setMsg("");
    try {
      const r = await api<{ count: number; text: string }>("/api/places", { body: { query: query || defaultQuery, clientId } });
      if (!r.count) { setState("error"); setMsg("Nenhum resultado. Tente outro termo."); return; }
      onChange(r.text); setState("idle"); setMsg(`✓ ${r.count} resultados do Google (mostrando os 5 primeiros). Revise antes de gerar.`);
    } catch (e) { setState("error"); setMsg((e as Error).message); }
  };

  const has = !!formData.realData?.trim();
  return (
    <div style={{ background: C.panel, border: `1px solid ${has ? "#166534" : "#7C2D1260"}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: has ? "#6EE7B7" : "#FCD34D", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {has ? "✓ Dados reais dos concorrentes" : "⚠ Dados reais dos concorrentes (obrigatório)"}
        </span>
        <span style={{ color: C.faint, fontSize: 11 }}>Usados em Auditoria, Avaliações e Prospecção</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input value={query} placeholder={defaultQuery || "Ex: Encanadores em São Paulo"} onChange={(e) => setQuery(e.target.value)}
          style={{ ...input, flex: 1, minWidth: 200, fontSize: 13 }} />
        <button type="button" onClick={search} disabled={!placesEnabled || state === "loading" || !(query || defaultQuery)}
          title={placesEnabled ? "" : "Configure GOOGLE_PLACES_API_KEY na Vercel"}
          style={btn(placesEnabled ? "linear-gradient(135deg,#7C3AED,#6D28D9)" : C.border, placesEnabled ? "#fff" : C.dim,
            { cursor: placesEnabled && state !== "loading" ? "pointer" : "not-allowed" })}>
          {state === "loading" ? "⟳ Buscando…" : "🔎 Buscar no Google Maps"}
        </button>
      </div>
      {!placesEnabled && <p style={{ color: C.dim, fontSize: 12, margin: "0 0 8px" }}>Busca automática desligada (falta a chave do Google). Cole os dados à mão abaixo.</p>}
      {msg && <p style={{ color: state === "error" ? C.red : "#6EE7B7", fontSize: 12, margin: "0 0 8px" }}>{msg}</p>}
      <textarea value={formData.realData ?? ""} onChange={(e) => onChange(e.target.value)}
        placeholder={"Cole aqui o que você viu no Google Maps. Ex.:\n1. Concorrente X — categoria: Encanador — 230 avaliações, nota 4,8 — 24h\n2. …"}
        style={{ ...input, minHeight: 130, fontSize: 12.5, lineHeight: 1.6, fontFamily: "ui-monospace, monospace", resize: "vertical" }} />
    </div>
  );
}
