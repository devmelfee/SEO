import type { CSSProperties } from "react";

// Tema claro e sóbrio: superfícies brancas, texto em ardósia e UMA cor de destaque (verde-azulado).
export const C = {
  bg: "#F6F7F9", panel: "#FFFFFF", panel2: "#F1F5F9", deep: "#EEF2F6", border: "#E2E8F0", borderBlue: "#CBD5E1",
  text: "#0F172A", body: "#334155", muted: "#64748B", dim: "#64748B", faint: "#94A3B8",
  teal: "#0F766E", blue: "#1D4ED8", green: "#047857", red: "#B91C1C",
};

export const input: CSSProperties = {
  width: "100%", background: "#FFFFFF", border: `1px solid ${C.borderBlue}`, borderRadius: 8, color: C.text,
  padding: "11px 13px", fontSize: 16, outline: "none", boxSizing: "border-box",
};

export const label: CSSProperties = {
  display: "block", color: C.body, fontSize: 13, fontWeight: 600, marginBottom: 6,
};

export const btn = (bg: string, color = "#fff", extra: CSSProperties = {}): CSSProperties => ({
  background: bg, color, border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13,
  fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", minHeight: 38, ...extra,
});

export const primary = "#0F766E";

export const overlay: CSSProperties = {
  position: "fixed", inset: 0, background: "#0F172A80", zIndex: 1000,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
