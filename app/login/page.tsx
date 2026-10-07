"use client";
import { useEffect, useState } from "react";
import { C, btn, input, primary } from "@/components/styles";

export default function Login() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((j) => setConfigured(!!j?.data?.auth)).catch(() => setConfigured(null));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (res.ok) { window.location.href = "/"; return; }
    setErr((await res.json().catch(() => null))?.error?.message ?? "Erro ao entrar."); setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400, background: C.panel, border: `1px solid ${C.borderBlue}`, borderRadius: 16, padding: 28 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📍</div>
        <h1 style={{ margin: "0 0 4px", fontSize: 20 }}>SEO Local Agency</h1>
        {configured === false ? (
          <div style={{ color: "#FCD34D", fontSize: 13, lineHeight: 1.7, marginTop: 14 }}>
            <p style={{ margin: "0 0 8px" }}><strong>Primeiro acesso:</strong> falta definir a senha da equipe.</p>
            <p style={{ margin: 0, color: C.body }}>Na Vercel, abra o projeto → <strong>Settings → Environment Variables</strong>, crie <code>APP_PASSWORD</code> (e as demais chaves do arquivo <code>.env.example</code>) e faça <strong>Redeploy</strong>.</p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ marginTop: 18 }}>
            <label htmlFor="pw" style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6 }}>Senha da equipe</label>
            <input id="pw" type="password" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} style={input} />
            {err && <p role="alert" style={{ color: C.red, fontSize: 13, margin: "10px 0 0" }}>{err}</p>}
            <button type="submit" disabled={busy || !pw} style={btn(primary, "#fff", { width: "100%", marginTop: 16, padding: "12px 0", fontSize: 14 })}>
              {busy ? "Entrando…" : "Entrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
