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
    <div style={{ background: C.panel, border: `1px solid ${has ? C.greenLine : C.amberLine}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: has ? C.green : C.amber, fontSize: 14, fontWeight: 600 }}>
          {has ? "✓ Concorrentes no Google" : "Concorrentes no Google (necessário para o diagnóstico)"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input value={query} placeholder={defaultQuery || "Ex: Encanadores em São Paulo"} onChange={(e) => setQuery(e.target.value)}
          style={{ ...input, flex: 1, minWidth: 200, fontSize: 13 }} />
        <button type="button" onClick={search} disabled={!placesEnabled || state === "loading" || !(query || defaultQuery)}
          title={placesEnabled ? "" : "Configure GOOGLE_PLACES_API_KEY na Vercel"}
          style={btn(placesEnabled ? C.teal : C.border, placesEnabled ? C.onAccent : C.dim,
            { cursor: placesEnabled && state !== "loading" ? "pointer" : "not-allowed" })}>
          {state === "loading" ? "⟳ Buscando…" : "Buscar no Google Maps"}
        </button>
      </div>
      {!placesEnabled && <p style={{ color: C.dim, fontSize: 12, margin: "0 0 8px" }}>Busca automática desligada (falta a chave do Google). Cole os dados à mão abaixo.</p>}
      {msg && <p style={{ color: state === "error" ? C.red : C.green, fontSize: 12, margin: "0 0 8px" }}>{msg}</p>}
      <textarea value={formData.realData ?? ""} onChange={(e) => onChange(e.target.value)}
        placeholder={"Cole aqui o que você viu no Google Maps. Ex.:\n1. Concorrente X — categoria: Encanador — 230 avaliações, nota 4,8 — 24h\n2. …"}
        style={{ ...input, minHeight: 130, fontSize: 12.5, lineHeight: 1.6, fontFamily: "ui-monospace, monospace", resize: "vertical" }} />
    </div>
  );
}
