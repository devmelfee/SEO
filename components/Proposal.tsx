"use client";
import { useEffect, useState } from "react";
import { api, copyText } from "@/lib/api";
import { whatsappNumber } from "@/lib/site";
import { clientWaLink, diagnosisMessage, proposalMessage, type ProposalData } from "@/lib/proposal";
import { SiteBuilder } from "./SiteBuilder";
import { C, btn, input, label, primary } from "./styles";

type Saved = { slug: string; data: ProposalData; status: "rascunho" | "enviada" | "aceita"; views: number; sent_at: string | null; accepted_at: string | null } | null;
type Loaded = { proposal: Saved; prefill: ProposalData; clientPhone: string; prospectId: string | null };

const day = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Botão verde que abre o WhatsApp do cliente — ou explica o que falta. */
export function WhatsAppButton({ phone, text, label: l, onSent }: { phone?: string; text: string; label: string; onSent?: () => void }) {
  const link = clientWaLink(phone, text);
  if (!link) return <span style={{ fontSize: 12, color: "#B45309" }}>Para enviar pelo WhatsApp, preencha o celular do cliente na etapa 1.</span>;
  return (
    <button type="button" onClick={() => { window.open(link, "_blank", "noopener"); onSent?.(); }} style={btn("#16A34A", "#fff")}>{l}</button>
  );
}

/** Etapa 2: resumo do diagnóstico para mandar antes da proposta. */
export function DiagnosisSend({ clientId, phone, sender }: { clientId: string | null; phone?: string; sender?: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!clientId) return;
    api<Loaded>(`/api/proposals?clientId=${clientId}`)
      .then((r) => { const d = r.proposal?.data ?? r.prefill; setText(diagnosisMessage(d.company, d.city, d.problems, sender)); })
      .catch(() => {});
  }, [clientId, sender]);
  if (!clientId) return null;
  return (
    <div className="dash-card" style={{ marginBottom: 20, borderColor: "#86EFAC" }}>
      <h3 className="dash-title">Mandar o diagnóstico no WhatsApp</h3>
      <p className="dash-sub">Os 3 problemas principais, em linguagem de dono de empresa. Edite à vontade antes de enviar.</p>
      <textarea aria-label="Mensagem do diagnóstico" value={text} onChange={(e) => setText(e.target.value)} rows={7}
        style={{ ...input, fontSize: 13, lineHeight: 1.55, resize: "vertical", marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <WhatsAppButton phone={phone} text={text} label="Enviar no WhatsApp do cliente" />
        <button type="button" onClick={() => copyText(text)} style={btn(C.panel2, C.blue, { border: `1px solid ${C.border}` })}>Copiar</button>
      </div>
    </div>
  );
}

/** Etapa 3: site de prévia + proposta com o nome da empresa, link público com "Aceitar". */
export function ProposalPanel({ clientId, phone, aiEnabled }: { clientId: string | null; phone?: string; aiEnabled: boolean }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [d, setD] = useState<ProposalData | null>(null);
  const [saved, setSaved] = useState<Saved>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = () => {
    if (!clientId) return;
    api<Loaded>(`/api/proposals?clientId=${clientId}`).then((r) => {
      setLoaded(r); setSaved(r.proposal);
      // Proposta salva manda; o link do site entra se ela ainda não tinha.
      setD(r.proposal ? { ...r.proposal.data, siteUrl: r.proposal.data.siteUrl || r.prefill.siteUrl } : r.prefill);
    }).catch((e) => setErr(e.message));
  };
  useEffect(load, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!clientId) return <p style={{ color: "#B45309", fontSize: 13 }}>⚠ Conclua a etapa 1 (Cliente) com o banco ligado para montar a proposta.</p>;
  if (err && !d) return <p style={{ color: C.red, fontSize: 13 }}>⚠ {err}</p>;
  if (!d || !loaded) return <p style={{ color: C.dim, fontSize: 13 }}>Montando a proposta…</p>;

  const set = <K extends keyof ProposalData>(k: K, v: ProposalData[K]) => { setD({ ...d, [k]: v }); setDirty(true); };
  const url = saved ? `${window.location.origin}/p/${saved.slug}` : "";
  const toPhone = phone || loaded.clientPhone;
  const ok = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  const save = async (): Promise<Saved> => {
    setBusy(true); setErr("");
    try {
      const row = await api<NonNullable<Saved>>("/api/proposals", { body: { clientId, data: { ...d, date: saved ? d.date : new Date().toISOString() } } });
      setSaved(row); setD(row.data); setDirty(false); ok("Proposta salva.");
      return row;
    } catch (e) { setErr((e as Error).message); return null; } finally { setBusy(false); }
  };
  const send = async () => {
    const row = dirty || !saved ? await save() : saved;
    if (!row) return;
    const link = clientWaLink(toPhone, proposalMessage(row.data, `${window.location.origin}/p/${row.slug}`));
    if (!link) return;
    window.open(link, "_blank", "noopener");
    await api("/api/proposals", { method: "PATCH", body: { clientId } }).catch(() => {});
    load();
  };

  const status = saved?.status === "aceita"
    ? <span style={{ color: "#047857", fontWeight: 700 }}>✅ Aceita em {day(saved.accepted_at!)}</span>
    : saved?.status === "enviada"
      ? <span style={{ color: "#D97706", fontWeight: 700 }}>Enviada {saved.sent_at ? day(saved.sent_at) : ""} · {saved.views ? `aberta ${saved.views}×` : "ainda não aberta"}</span>
      : saved ? <span style={{ color: C.muted }}>Rascunho salvo</span> : <span style={{ color: C.muted }}>Ainda não salva</span>;

  return (
    <div>
      <details className="dash-card" style={{ marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span>Site de prévia</span><span style={{ fontWeight: 500, fontSize: 13, color: d.siteUrl ? C.green : C.muted }}>{d.siteUrl ? "✓ pronto" : "opcional · criar ▾"}</span></summary>
        <div style={{ marginTop: 12 }}>
          <SiteBuilder target={loaded.prospectId ? { prospectId: loaded.prospectId } : { clientId }} aiEnabled={aiEnabled} />
          <button type="button" onClick={load} style={btn(C.panel2, C.blue, { border: `1px solid ${C.border}`, marginTop: 10, fontSize: 12 })}>↻ Colocar o link do site na proposta</button>
        </div>
      </details>

      <div className="dash-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <h3 className="dash-title" style={{ margin: 0 }}>Proposta para {d.company || "a empresa"}</h3>
          <span style={{ fontSize: 12, marginLeft: "auto" }}>{status}</span>
        </div>

        <div className="site-form">
          <div><label style={label}>Nome da empresa (aparece no título)</label>
            <input value={d.company} onChange={(e) => set("company", e.target.value)} style={{ ...input, fontSize: 13 }} /></div>
          <div><label style={label}>Validade (dias)</label>
            <input type="number" min={1} max={90} value={d.validDays} onChange={(e) => set("validDays", Math.max(1, Number(e.target.value) || 7))} style={{ ...input, fontSize: 13 }} /></div>
          <div><label style={label}>Teste de 30 dias</label>
            <input value={d.trialPrice} placeholder="Ex: R$ 497" onChange={(e) => set("trialPrice", e.target.value)} style={{ ...input, fontSize: 13 }} /></div>
          <div><label style={label}>Mensalidade depois</label>
            <input value={d.monthlyPrice} placeholder="Ex: R$ 997" onChange={(e) => set("monthlyPrice", e.target.value)} style={{ ...input, fontSize: 13 }} /></div>
        </div>
        {!d.agencyWhatsapp && <p style={{ fontSize: 12, color: "#B45309", margin: "8px 0 0" }}>⚠ Cadastre o WhatsApp da agência em Configurações → Agência para o "Aceitar" chegar até você.</p>}

        <p style={{ ...label, marginTop: 16 }}>O que encontramos (vem do Radar; edite à vontade)</p>
        {d.problems.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <input aria-label="Problema" value={p.title} onChange={(e) => set("problems", d.problems.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
              style={{ ...input, flex: "1 1 160px", fontSize: 13, fontWeight: 700 }} />
            <input aria-label="Detalhe" value={p.detail} onChange={(e) => set("problems", d.problems.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)))}
              style={{ ...input, flex: "3 1 260px", fontSize: 13 }} />
            <button type="button" aria-label="Remover" onClick={() => set("problems", d.problems.filter((_, j) => j !== i))} style={btn("#FEF2F2", C.red)}>✕</button>
          </div>
        ))}
        {d.problems.length < 10 && (
          <button type="button" onClick={() => set("problems", [...d.problems, { title: "", detail: "" }])} style={btn(C.panel2, C.blue, { border: `1px solid ${C.border}`, fontSize: 12 })}>+ Problema</button>
        )}

        {d.comparison.length > 0 && (
          <p style={{ fontSize: 12, color: C.muted, margin: "12px 0 0" }}>
            Comparação com concorrentes incluída: {d.comparison.map((r) => `${r.name}${r.you ? " (vocês)" : ""} — ${r.reviews} aval.`).join(" · ")}
            {" "}<button type="button" onClick={() => set("comparison", [])} style={btn("transparent", C.dim, { border: `1px solid ${C.border}`, fontSize: 11, padding: "2px 8px" })}>tirar</button>
          </p>
        )}

        <label style={{ ...label, marginTop: 16, display: "block" }} htmlFor="deliv">O que vamos fazer (um por linha)</label>
        <textarea id="deliv" rows={6} value={d.deliverables.join("\n")} onChange={(e) => set("deliverables", e.target.value.split("\n"))}
          style={{ ...input, fontSize: 13, lineHeight: 1.55, resize: "vertical" }} />
        <label style={{ ...label, marginTop: 12, display: "block" }} htmlFor="terms">Condições</label>
        <input id="terms" value={d.terms} onChange={(e) => set("terms", e.target.value)} style={{ ...input, fontSize: 13 }} />
        <p style={{ fontSize: 12, color: C.muted, margin: "8px 0 0" }}>{d.siteUrl ? `Link do site na proposta: ${d.siteUrl}` : "Sem site de prévia na proposta."}</p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16, alignItems: "center" }}>
          <button type="button" disabled={busy || !d.company.trim()} onClick={save} style={btn(primary)}>{busy ? "Salvando…" : dirty || !saved ? "Salvar proposta" : "✓ Salva"}</button>
          {whatsappNumber(toPhone)
            ? <button type="button" disabled={busy} onClick={send} style={btn("#16A34A", "#fff")}>Enviar proposta no WhatsApp</button>
            : <span style={{ fontSize: 12, color: "#B45309" }}>Preencha o celular do cliente na etapa 1 para enviar pelo WhatsApp.</span>}
          {saved && <>
            <a href={`/p/${saved.slug}?preview=1`} target="_blank" rel="noreferrer" style={{ ...btn(C.border, C.text), textDecoration: "none" }}>Ver como o cliente vê</a>
            <button type="button" onClick={async () => ok((await copyText(url)) ? "Link copiado." : "Não deu para copiar.")} style={btn(C.border, C.text)}>Copiar link</button>
          </>}
          {msg && <span role="status" style={{ color: "#047857", fontSize: 12 }}>✓ {msg}</span>}
          {err && <span role="alert" style={{ color: C.red, fontSize: 12 }}>⚠ {err}</span>}
        </div>
        {saved && <p style={{ fontSize: 11.5, color: C.dim, margin: "8px 0 0", wordBreak: "break-all" }}>{url} · o cliente pode salvar em PDF pelo navegador.</p>}
      </div>
    </div>
  );
}
