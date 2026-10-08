"use client";
import { C, btn } from "./styles";

export function LogoutButton() {
  return (
    <button type="button" onClick={() => fetch("/api/logout", { method: "POST" }).finally(() => (window.location.href = "/login"))}
      style={btn(C.panel2, C.blue, { border: `1px solid ${C.border}`, marginTop: 8 })}>Sair</button>
  );
}
