import type { CSSProperties } from "react";

// Cores do app como variáveis CSS (valores em app/globals.css): tema claro e escuro trocam sem mudar componente.
// Uma cor de destaque (verde-azulado); verde, âmbar e vermelho só para estado. Ver DESIGN.md.
const v = (n: string) => `var(--${n})`;
export const C = {
  bg: v("bg"), panel: v("panel"), panel2: v("panel-2"), deep: v("deep"), border: v("line"), borderBlue: v("line-strong"),
  text: v("ink"), body: v("body"), muted: v("muted"), dim: v("muted"), faint: v("faint"),
  teal: v("teal"), tealDeep: v("teal-deep"), tealWash: v("teal-wash"), tealMist: v("teal-mist"), tealLine: v("teal-line"),
  onAccent: v("on-accent"), blue: v("link"),
  green: v("green"), greenWash: v("green-wash"), greenLine: v("green-line"),
  amber: v("amber"), amberWash: v("amber-wash"), amberLine: v("amber-line"),
  orange: v("orange"), pink: v("pink"), red: v("red"), redWash: v("red-wash"), redLine: v("red-line"),
};

export const input: CSSProperties = {
  width: "100%", background: C.panel, border: `1px solid ${C.borderBlue}`, borderRadius: 8, color: C.text,
  padding: "11px 13px", fontSize: 16, outline: "none", boxSizing: "border-box",
};

export const label: CSSProperties = {
  display: "block", color: C.body, fontSize: 13, fontWeight: 600, marginBottom: 6,
};

export const btn = (bg: string, color: string = C.onAccent, extra: CSSProperties = {}): CSSProperties => ({
  background: bg, color, border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13,
  fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", minHeight: 38, ...extra,
});

export const primary = C.teal;

export const overlay: CSSProperties = {
  position: "fixed", inset: 0, background: "var(--veil)", zIndex: 1000,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
