"use client";
import { useEffect, useRef, useState } from "react";
import { blockReason, fill, slugify, type FormData, type Part } from "@/lib/phases";
import { copyText, downloadTxt, generateText, type Section } from "@/lib/api";
import { C, btn } from "./styles";

type Props = {
  part: Part;
  formData: FormData;
  color: string;
  saved?: Section;
  /** false quando a ANTHROPIC_API_KEY não está configurada: o cartão vira "copiar prompt + colar resultado". */
  aiEnabled: boolean;
  /** Texto novo da IA. */
  onGenerated: (label: string, text: string) => Promise<void>;
  /** Edição manual (já com debounce). */
  onEdited: (label: string, text: string) => Promise<void>;
};

export function PromptCard({ part, formData, color, saved, aiEnabled, onGenerated, onEdited }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(saved ? "done" : "idle");
  const [original, setOriginal] = useState(saved?.original || saved?.content || "");
  const [text, setText] = useState(saved?.content ?? "");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [flash, setFlash] = useState("");
  const [confirmRegen, setConfirmRegen] = useState(false);

  const filledPrompt = fill(part.prompt, formData);
  const blocked = blockReason(part, formData) ?? (aiEnabled ? null : "IA desligada (falta ANTHROPIC_API_KEY). Copie o prompt, use no Claude.ai e cole o resultado com \"Colar resultado\".");
  const dirty = state === "done" && text !== original;

  // Autosave com debounce. O timer é limpo ao desmontar e a edição pendente é gravada na hora (antes se perdia).
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pending = useRef<string | null>(null);
  const onEditedRef = useRef(onEdited);
  onEditedRef.current = onEdited;

  const flush = async () => {
    clearTimeout(timer.current);
    const value = pending.current;
    if (value === null) return;
    pending.current = null;
    setSaveStatus("saving");
    try { await onEditedRef.current(part.label, value); setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); }
    catch { setSaveStatus("error"); }
  };
  useEffect(() => () => { void flush(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEdit = (v: string) => {
    setText(v);
    pending.current = v;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 1000);
  };

  const restore = () => { handleEdit(original); void flush(); };

  const doGenerate = async () => {
    if (blocked) return;
    pending.current = null; clearTimeout(timer.current);
    setState("loading"); setError(""); setEditing(false); setConfirmRegen(false);
    try {
      const out = await generateText(part.system, filledPrompt, part.maxTokens ?? 4096);
      setOriginal(out); setText(out); setState("done");
      setSaveStatus("saving");
      try { await onGenerated(part.label, out); setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); }
      catch { setSaveStatus("error"); }
    } catch (e) {
      setError((e as Error).message);
      setState(text ? "done" : "error"); // falha ao regenerar não apaga o texto que já existia
    }
  };

  const onGenerateClick = () => (dirty ? setConfirmRegen(true) : doGenerate());
  /** Sem IA: abre o editor vazio para colar o texto gerado fora do app. */
  const startManual = () => { setOriginal(""); setText(""); setState("done"); setEditing(true); };
  const showFlash = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 1800); };

  const badge =
    state !== "done" ? null
    : saveStatus === "saving" ? { t: "salvando…", c: "#D97706" }
    : saveStatus === "error" ? { t: "⚠ não salvou", c: "#DC2626" }
    : saveStatus === "saved" ? { t: "✓ salvo", c: C.green }
    : dirty ? { t: "✏ editado", c: "#0F766E" }
    : { t: "IA", c: C.blue };

  return (
    <div style={{ background: C.panel, border: `1px solid ${color}30`, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px",
        borderBottom: `1px solid ${color}20`, background: C.panel2, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#0F172A", fontSize: 14.5, fontWeight: 600 }}>{part.label}</span>
          {badge && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, color: badge.c, border: `1px solid ${badge.c}40` }}>{badge.t}</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={async () => showFlash((await copyText(filledPrompt)) ? "prompt" : "erro")}
            style={btn(C.border, C.muted, { fontSize: 11, fontWeight: 600 })}>{flash === "prompt" ? "✓ Copiado" : "Copiar prompt"}</button>
          {!aiEnabled && state !== "done" && (
            <button type="button" onClick={startManual} style={btn(color)}>Colar resultado</button>
          )}
          <button type="button" onClick={onGenerateClick} disabled={state === "loading" || !!blocked} title={blocked ?? ""}
            style={btn(state === "loading" || blocked ? C.border : color,
              state === "loading" || blocked ? C.muted : "#fff", { cursor: state === "loading" || blocked ? "not-allowed" : "pointer" })}>
            {state === "loading" ? "⟳ Gerando…" : state === "done" ? "↺ Regenerar" : "Gerar com IA"}
          </button>
        </div>
      </div>

      {blocked && state !== "loading" && (
        <div style={{ padding: "10px 16px", background: "#FFFBEB", color: "#B45309", fontSize: 12, borderBottom: `1px solid ${color}20` }}>⚠ {blocked}</div>
      )}

      {confirmRegen && (
        <div style={{ padding: "12px 16px", background: "#FFFBEB", borderBottom: `1px solid ${color}20`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ color: "#B45309", fontSize: 12, flex: 1 }}>⚠ Você editou este texto. Regenerar substitui suas edições.</span>
          <button type="button" onClick={doGenerate} style={btn("#B45309")}>Sim, regenerar</button>
          <button type="button" onClick={() => setConfirmRegen(false)} style={btn(C.border, "#64748B")}>Cancelar</button>
        </div>
      )}

      <details style={{ borderBottom: `1px solid ${color}15` }}>
        <summary style={{ padding: "8px 16px", color: C.dim, fontSize: 12, cursor: "pointer", userSelect: "none" }}>Ver prompt completo</summary>
        <pre style={{ margin: 0, padding: "12px 16px 16px", color: C.muted, fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "monospace", background: C.deep }}>{filledPrompt}</pre>
      </details>

      {state === "loading" && (
        <div style={{ padding: 28, textAlign: "center" }}>
          <div className="spin" style={{ fontSize: 24, marginBottom: 8 }}>⟳</div>
          <p style={{ color: C.dim, margin: 0, fontSize: 13 }}>A IA está gerando… (pode levar até 1 minuto)</p>
        </div>
      )}

      {error && state !== "loading" && (
        <div style={{ padding: "12px 20px", color: C.red, fontSize: 13, background: "#FEF2F2" }}>⚠ {error}</div>
      )}

      {state === "done" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px",
            borderBottom: `1px solid ${color}15`, background: C.deep, flexWrap: "wrap", gap: 6 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => setEditing((e) => !e)}
                style={btn(editing ? `${color}22` : C.border, editing ? color : C.muted, { fontSize: 11, fontWeight: 600, padding: "4px 10px" })}>
                {editing ? "Ver" : "✏Editar"}
              </button>
              {dirty && (
                <button type="button" onClick={restore} style={btn("#F5F3FF", "#0F766E", { fontSize: 11, fontWeight: 600, padding: "4px 10px" })}>↩ Restaurar IA</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => downloadTxt(`${slugify(`${formData.clientName ?? ""}-${part.label}`)}.txt`, text)}
                style={btn("#F0FDFA", C.blue, { fontSize: 11, fontWeight: 600, padding: "4px 10px" })}>⬇ .txt</button>
              <button type="button" onClick={async () => showFlash((await copyText(text)) ? "text" : "erro")}
                style={btn(flash === "text" ? "#DCFCE7" : "#F0FDFA", flash === "text" ? "#047857" : C.blue, { fontSize: 11, fontWeight: 600, padding: "4px 12px" })}>
                {flash === "text" ? "✓ Copiado!" : flash === "erro" ? "Falhou" : "Copiar"}
              </button>
            </div>
          </div>
          {editing ? (
            <div style={{ padding: "16px 20px" }}>
              <textarea value={text} onChange={(e) => handleEdit(e.target.value)} onBlur={() => void flush()}
                style={{ width: "100%", minHeight: 280, background: C.deep, border: `1px solid ${color}40`, borderRadius: 8, color: C.body,
                  fontSize: 13, lineHeight: 1.75, padding: 14, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              <p style={{ color: C.faint, fontSize: 11, margin: "6px 0 0" }}>Salvo automaticamente 1s depois que você para de digitar.</p>
            </div>
          ) : (
            <div style={{ padding: 20, color: C.body, fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap", maxHeight: 440, overflowY: "auto" }}>{text}</div>
          )}
        </div>
      )}

      {state === "idle" && !blocked && (
        <div style={{ padding: "18px 20px", color: C.faint, fontSize: 13 }}>
          Clique em <strong style={{ color }}>Gerar com IA</strong>, ou copie o prompt para usar em outra ferramenta.
        </div>
      )}
    </div>
  );
}
