"use client";
import { useState } from "react";
import { isValidUrl } from "@/lib/phases";
import { C, input } from "./styles";

/** Nicho: lista ou texto livre. O modo vem do valor (corrige o estado preso após "Novo cliente"). */
export function VerticalPicker({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [forceCustom, setForceCustom] = useState(false);
  const mode = forceCustom || (value && !options.includes(value)) ? "custom" : "select";
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {([["select", "Escolher da lista"], ["custom", "Digitar nicho próprio"]] as const).map(([m, lbl]) => (
          <button key={m} type="button"
            onClick={() => { setForceCustom(m === "custom"); if (m === "select" && !options.includes(value)) onChange(""); }}
            style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
              background: mode === m ? C.teal : C.panel2, color: mode === m ? "#fff" : C.dim }}>{lbl}</button>
        ))}
      </div>
      {mode === "select" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...input, color: value ? C.text : C.dim, cursor: "pointer" }}>
          <option value="">Selecione um nicho…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type="text" value={value} autoFocus placeholder="Ex: Pet Shops, Fotógrafos, Academias…"
          onChange={(e) => onChange(e.target.value)} style={input} />
      )}
    </div>
  );
}

/** URL: status calculado do valor a cada render (antes ficava preso no primeiro valor). */
export function UrlField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const status = !value ? "idle" : isValidUrl(value) ? "ok" : "warn";
  const color = status === "ok" ? C.teal : status === "warn" ? "#B45309" : C.border;
  return (
    <div>
      <div style={{ position: "relative" }}>
        <input type="url" value={value} placeholder="https://…" onChange={(e) => onChange(e.target.value)}
          style={{ ...input, border: `1px solid ${color}`, paddingLeft: 40 }} />
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>
          {status === "ok" ? "🔗" : status === "warn" ? "⚠️" : "🌐"}
        </span>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: status === "idle" ? C.faint : color }}>
        {status === "ok" ? "✓ Os prompts vão citar este site"
          : status === "warn" ? "⚠️ Endereço inválido — comece com https://"
          : "Opcional — site, Google Maps ou perfil do cliente"}
      </div>
    </div>
  );
}
