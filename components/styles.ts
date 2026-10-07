import type { CSSProperties } from "react";

export const C = {
  bg: "#030812", panel: "#080F1A", panel2: "#0A1628", deep: "#060D18", border: "#1E293B", borderBlue: "#1E3A5F",
  text: "#F1F5F9", body: "#CBD5E1", muted: "#64748B", dim: "#475569", faint: "#334155",
  teal: "#0D9488", blue: "#60A5FA", green: "#10B981", red: "#FCA5A5",
};

export const input: CSSProperties = {
  width: "100%", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text,
  padding: "11px 13px", fontSize: 14, outline: "none", boxSizing: "border-box",
};

export const label: CSSProperties = {
  display: "block", color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 7,
  textTransform: "uppercase", letterSpacing: "0.07em",
};

export const btn = (bg: string, color = "#fff", extra: CSSProperties = {}): CSSProperties => ({
  background: bg, color, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12,
  fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", ...extra,
});

export const primary = "linear-gradient(135deg,#0D9488,#0891B2)";

export const overlay: CSSProperties = {
  position: "fixed", inset: 0, background: "#000000DD", zIndex: 1000,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
