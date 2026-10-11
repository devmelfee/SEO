"use client";
import { useEffect, useState } from "react";
import { api, copyText } from "@/lib/api";
import { buildSitePrompt, whatsappNumber, type SiteData } from "@/lib/site";
import { C, btn, input, label, primary } from "./styles";

type Target = { prospectId?: string; clientId?: string };
type SiteMeta = { slug: string; source: string; external_url?: string | null; url?: string; updated_at: string; views: number } | null;
type Origin = "modelo" | "ia" | "externo";
const ORIGINS: [Origin, string][] = [["modelo", "Modelo"], ["ia", "Com IA"], ["externo", "Link externo"]];

/**
 * Site de um lead (Radar) ou cliente (Proposta), de três origens: modelo pronto, gerado por IA
 * (ou HTML colado) ou o link de um site feito em outro app. O link certo vai para a proposta e para a Abordagem.
 */
export function SiteBuilder({ target, aiEnabled, onPublished }: { target: Target; aiEnabled: boolean; onPublished?: (url: string) => void }) {
  const [data, setData] = useState<SiteData | null>(null);
  const [site, setSite] = useState<SiteMeta>(null);
  const [busy, setBusy] = useState<"" | "modelo" | "ia" | "manual" | "externo">("");
  const [err, setErr] = useState("");
  const [flash, setFlash] = useState("");
  const [paste, setPaste] = useState<string | null>(null);
  const [v, setV] = useState(0); // força recarregar a prévia
  const [origin, setOrigin] = useState<Origin>("modelo");
  const [ext, setExt] = useState("");

  const qs = target.prospectId ? `prospectId=${target.prospectId}` : `clientId=${target.clientId}`;
  useEffect(() => {
    api<{ site: SiteMeta; data: SiteData }>(`/api/sites?${qs}`).then((r) => {
      setData(r.data); setSite(r.site);
      if (r.site) { setOrigin(r.site.source === "externo" ? "externo" : r.site.source === "modelo" ? "modelo" : "ia"); setExt(r.site.external_url ?? ""); }
    }).catch((e) => setErr(e.message));
  }, [qs]);

  if (err && !data) return <p style={{ color: C.red, fontSize: 13 }}>⚠ {err}</p>;
  if (!data) return <p style={{ color: C.dim, fontSize: 13 }}>Carregando dados…</p>;

  const set = (k: keyof SiteData, val: unknown) => setData((d) => ({ ...d!, [k]: val }));
  const valid = data.name.trim().length > 1 && data.niche.trim().length > 1 && data.city.trim().length > 1;
  const url = site ? site.url || `${typeof window !== "undefined" ? window.location.origin : ""}/s/${site.slug}` : "";
  const isExternal = site?.source === "externo";
  const ok = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 2000); };

  const publish = async (mode: "modelo" | "ia" | "manual" | "externo", html?: string) => {
    setBusy(mode); setErr("");
    try {
      const clean: SiteData = { ...data, hours: (data.hours ?? []).filter(Boolean), services: (data.services ?? []).filter(Boolean) };
      const r = await api<{ slug: string; url: string }>("/api/sites", { body: { target, data: clean, mode, html, externalUrl: mode === "externo" ? ext : undefined } });
      const external = mode === "externo" ? r.url : null;
      setSite({ slug: r.slug, source: mode, external_url: external, url: r.url, updated_at: new Date().toISOString(), views: site?.views ?? 0 });
      if (external) setExt(external);
      setPaste(null); setV((x) => x + 1);
      onPublished?.(r.url);
    } catch (e) { setErr((e as Error).message); }
    setBusy("");
  };

  const waMsg = isExternal
    ? `Olá! Tudo bem? Este é o site que preparei para a ${data.name}, pensado para trazer clientes do Google em ${data.city}: ${url}\nO que achou?`
    : `Olá! Tudo bem? Fiz uma prévia de como poderia ficar o site da ${data.name}, focado em trazer clientes do Google em ${data.city}: ${url}\nPosso te mostrar como colocar no ar?`;
  const field = (k: keyof SiteData, l: string, ph = "") => (
    <div><label style={label}>{l}</label>
      <input value={(data[k] as string) ?? ""} placeholder={ph} onChange={(e) => set(k, e.target.value)} style={{ ...input, fontSize: 13 }} /></div>
  );

  return (
    <div>
      <div className="seg" role="tablist" aria-label="Origem do site" style={{ marginBottom: 12 }}>
        {ORIGINS.map(([o, l]) => (
          <button key={o} type="button" role="tab" aria-selected={origin === o} onClick={() => setOrigin(o)}>{l}</button>
        ))}
      </div>

      {origin === "externo" ? (
        <div>
          <label style={label} htmlFor="site-externo">Endereço do site</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input id="site-externo" inputMode="url" value={ext} onChange={(e) => setExt(e.target.value)} placeholder="https://petfeliz.com.br"
              style={{ ...input, flex: "1 1 220px", width: "auto" }} />
            <button type="button" disabled={!ext.trim() || !!busy} onClick={() => publish("externo")} style={btn(primary)}>
              {busy === "externo" ? "Salvando…" : "Usar este link"}
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: C.muted, margin: "6px 0 0" }}>
            Para sites feitos em outra aplicação. Este link entra na proposta, nas mensagens da Abordagem e no Perfil do Google.
          </p>
        </div>
      ) : (<>
      <div className="site-form">
        {field("name", "Nome da empresa")}
        {field("niche", "Nicho")}
        {field("city", "Cidade")}
        {field("phone", "Telefone / WhatsApp", "(11) 9xxxx-xxxx")}
        <div style={{ gridColumn: "1 / -1" }}>{field("address", "Endereço")}</div>
        <div style={{ gridColumn: "1 / -1" }}>{field("tagline", "Frase de destaque (opcional)", `Ex: ${data.niche} em ${data.city} com atendimento rápido`)}</div>
        <div><label style={label}>Serviços (um por linha, opcional)</label>
          <textarea rows={4} value={(data.services ?? []).join("\n")} onChange={(e) => set("services", e.target.value.split("\n"))}
            placeholder="Deixe vazio para usar os típicos do nicho" style={{ ...input, fontSize: 13, resize: "vertical" }} /></div>
        <div><label style={label}>Horário (um dia por linha)</label>
          <textarea rows={4} value={(data.hours ?? []).join("\n")} onChange={(e) => set("hours", e.target.value.split("\n"))}
            placeholder="segunda-feira: 09:00 – 18:00" style={{ ...input, fontSize: 13, resize: "vertical" }} /></div>
      </div>
      <p style={{ fontSize: 11.5, color: C.muted, margin: "8px 0 12px" }}>
        {whatsappNumber(data.phone) ? "✓ Celular reconhecido: o site terá botão de WhatsApp." : "Sem celular reconhecido: o site usa o botão Ligar."}
        {data.rating && data.reviews ? ` · Mostra a nota real do Google (${data.rating} · ${data.reviews} avaliações).` : " · Sem nota no Google: avaliações não aparecem."}
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {origin === "modelo" ? (
        <button type="button" disabled={!valid || !!busy} onClick={() => publish("modelo")} style={btn(primary)}>
          {busy === "modelo" ? "Gerando…" : "Gerar com modelo (na hora)"}
        </button>
        ) : (<>
        <button type="button" disabled={!valid || !!busy || !aiEnabled} onClick={() => publish("ia")}
          title={aiEnabled ? "" : "Configure ANTHROPIC_API_KEY para gerar com IA"}
          style={btn(aiEnabled ? C.teal : C.border, aiEnabled ? C.onAccent : C.dim)}>
          {busy === "ia" ? "A IA está criando (até 1 min)…" : "Gerar com IA"}
        </button>
        <button type="button" disabled={!valid} onClick={async () => { const p = buildSitePrompt(data); ok((await copyText(`${p.system}\n\n${p.prompt}`)) ? "Prompt copiado — cole no Claude.ai" : "Não deu para copiar"); }}
          style={btn(C.panel2, C.blue, { border: `1px solid ${C.border}` })}>Copiar prompt</button>
        <button type="button" onClick={() => setPaste(paste === null ? "" : null)} style={btn(C.panel2, C.blue, { border: `1px solid ${C.border}` })}>
          {paste === null ? "Colar HTML pronto" : "Cancelar colagem"}
        </button>
        </>)}
      </div>

      {paste !== null && (
        <div style={{ marginTop: 10 }}>
          <textarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Cole aqui o HTML que o Claude.ai gerou (de <!doctype html> até </html>)"
            style={{ ...input, fontFamily: "ui-monospace, monospace", fontSize: 12, resize: "vertical" }} />
          <button type="button" disabled={!paste.trim() || !!busy} onClick={() => publish("manual", paste)} style={btn(primary, C.onAccent, { marginTop: 8 })}>
            {busy === "manual" ? "Publicando…" : "Publicar HTML colado"}
          </button>
        </div>
      )}
      </>)}

      {err && <p role="alert" style={{ color: C.red, fontSize: 13, marginTop: 10 }}>⚠ {err}</p>}
      {flash && <p role="status" style={{ color: C.green, fontSize: 13, marginTop: 10 }}>✓ {flash}</p>}

      {site && (
        <div style={{ marginTop: 16, background: C.panel2, border: `1px solid ${C.borderBlue}`, borderRadius: 12, padding: 14 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ fontSize: 13 }}>{isExternal ? "Site de outro app" : "Site publicado"}</strong>
            <span style={{ fontSize: 11, color: C.muted }}>({isExternal ? "link externo" : `${site.source === "ia" ? "gerado por IA" : site.source === "manual" ? "HTML colado" : "modelo"} · ${site.views} visita${site.views === 1 ? "" : "s"}`})</span>
          </div>
          <a href={url} target="_blank" rel="noreferrer" style={{ color: C.blue, fontSize: 13, wordBreak: "break-all" }}>{url}</a>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button type="button" onClick={async () => ok((await copyText(url)) ? "Link copiado" : "Não deu para copiar")} style={btn(C.border, C.text)}>Copiar link</button>
            <button type="button" onClick={async () => ok((await copyText(waMsg)) ? "Mensagem copiada" : "Não deu para copiar")} style={btn(C.border, C.text)}>Copiar mensagem para o dono</button>
            <a href={url} target="_blank" rel="noreferrer" style={{ ...btn(C.border, C.text), textDecoration: "none" }}>Abrir ↗</a>
          </div>
          {!isExternal && <iframe key={v} title="Prévia do site" src={`/s/${site.slug}`} sandbox="allow-popups allow-popups-to-escape-sandbox"
            style={{ width: "100%", height: 420, border: `1px solid ${C.border}`, borderRadius: 10, marginTop: 12, background: "#fff" }} />}
        </div>
      )}
    </div>
  );
}
