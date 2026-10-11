"use client";
import { useEffect, useState } from "react";
import { api, copyText } from "@/lib/api";
import { C, btn, input, label, primary } from "./styles";

type Key = { id: string; name: string; prefix: string; scopes: string[]; created_by: string; created_at: string; last_used_at: string | null; revoked_at: string | null };
const day = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Ajustes › API: chaves para outro app, site ou CRM puxar os dados das buscas. */
export function ApiTab() {
  const [keys, setKeys] = useState<Key[] | null>(null);
  const [name, setName] = useState("");
  const [write, setWrite] = useState(false);
  const [fresh, setFresh] = useState<{ name: string; key: string } | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const load = () => api<Key[]>("/api/keys").then(setKeys).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    try {
      const r = await api<{ name: string; key: string }>("/api/keys", { body: { name, scopes: write ? ["read", "write"] : ["read"] } });
      setFresh({ name: r.name, key: r.key }); setName(""); setWrite(false); load();
    } catch (x) { setErr((x as Error).message); }
  };
  const revoke = async (k: Key) => {
    if (!confirm(`Revogar a chave "${k.name}"? Quem usa esta chave perde o acesso na hora.`)) return;
    try { await api(`/api/keys?id=${k.id}`, { method: "DELETE" }); load(); } catch (x) { setErr((x as Error).message); }
  };

  return (
    <div>
      <p style={{ color: C.body, fontSize: 14, margin: "0 0 14px", lineHeight: 1.6 }}>
        Use uma chave para outro sistema (CRM, planilha, site, Zapier/Make) puxar as empresas encontradas nas buscas.
        Crie uma chave por integração — assim dá para revogar uma sem parar as outras. <a href="/api-docs" target="_blank" rel="noreferrer">Ver documentação</a>
      </p>

      {fresh && (
        <div role="status" style={{ background: C.greenWash, border: "1px solid var(--green-line)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <strong style={{ fontSize: 14 }}>Chave "{fresh.name}" criada. Copie agora — ela não aparece de novo.</strong>
          <code style={{ display: "block", wordBreak: "break-all", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, margin: "10px 0", fontSize: 13 }}>{fresh.key}</code>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={async () => setMsg((await copyText(fresh.key)) ? "Chave copiada." : "Não deu para copiar.")} style={btn(primary)}>Copiar chave</button>
            <button type="button" onClick={async () => setMsg((await copyText(`curl -H "Authorization: Bearer ${fresh.key}" "${origin}/api/v1/leads?limit=5"`)) ? "Exemplo copiado." : "Não deu para copiar.")}
              style={btn(C.panel, C.body, { border: `1px solid ${C.border}` })}>Copiar exemplo (curl)</button>
            <button type="button" onClick={() => setFresh(null)} style={btn("transparent", C.muted)}>Já guardei</button>
          </div>
          {msg && <p style={{ fontSize: 12.5, color: C.green, margin: "8px 0 0" }}>✓ {msg}</p>}
        </div>
      )}

      <form onSubmit={create} style={{ display: "grid", gap: 10, marginBottom: 18 }}>
        <div><label style={label} htmlFor="key-name">Nome da integração</label>
          <input id="key-name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: CRM da agência, Planilha, Site" style={input} /></div>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, color: C.body }}>
          <input type="checkbox" checked={write} onChange={(e) => setWrite(e.target.checked)} style={{ marginTop: 3 }} />
          <span>Permitir que a integração atualize status e anotações dos leads <span style={{ color: C.muted }}>(sem marcar: só leitura)</span></span>
        </label>
        <button type="submit" style={btn(primary, C.onAccent, { justifySelf: "start" })}>Criar chave</button>
      </form>
      {err && <p style={{ color: C.red, fontSize: 13 }}>⚠ {err}</p>}

      <h3 className="dash-title" style={{ marginBottom: 8 }}>Chaves</h3>
      {!keys ? <p style={{ color: C.muted, fontSize: 13 }}>Carregando…</p> : !keys.length ? <p style={{ color: C.muted, fontSize: 13 }}>Nenhuma chave ainda.</p> : keys.map((k) => (
        <div key={k.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.border}`, opacity: k.revoked_at ? 0.55 : 1 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{k.name} <span style={{ fontWeight: 400, color: C.muted, fontSize: 12.5 }}>· {k.scopes.includes("write") ? "leitura e escrita" : "só leitura"}</span></div>
            <div style={{ fontSize: 12.5, color: C.muted }}>
              <code>{k.prefix}…</code> · criada {day(k.created_at)} · {k.revoked_at ? `revogada ${day(k.revoked_at)}` : k.last_used_at ? `último uso ${day(k.last_used_at)}` : "nunca usada"}
            </div>
          </div>
          {!k.revoked_at && <button type="button" onClick={() => revoke(k)} style={btn(C.redWash, C.red)}>Revogar</button>}
        </div>
      ))}
    </div>
  );
}
