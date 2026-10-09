"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { CONTACT_LABEL, formatCnpj, samePhone, type CompanyData, type ContactStatus, type LinkResult } from "@/lib/contact";
import { whatsappNumber } from "@/lib/site";
import type { Prospect } from "./Radar";
import { C, btn, input, label } from "./styles";

export type DecisionMaker = { name: string; role: string; phone: string; email: string; source: "receita" | "conversa" | "manual" };
export type ContactFields = {
  cnpj?: string | null; company_data?: CompanyData | null; decision_maker?: DecisionMaker | null;
  contact_status?: ContactStatus; link_check?: { website?: LinkResult | null } | null; contact_checked_at?: string | null; business_status?: string;
};

const LINK_TEXT: Record<LinkResult["state"], [string, string]> = {
  ok: ["✓ no ar", C.green], fora_do_ar: ["✕ fora do ar", "#B91C1C"], nao_encontrado: ["✕ página não existe", "#B91C1C"],
  nao_verificavel: ["não dá para confirmar automaticamente — abra e veja", "#B45309"],
};
const STATUS_COLOR: Record<ContactStatus, string> = { nao_verificado: C.muted, confirmado: C.green, invalido: "#B91C1C", sem_whatsapp: "#B45309" };

/** Selo curto para a lista de leads. */
export function ContactBadge({ p }: { p: ContactFields }) {
  const st = p.contact_status ?? "nao_verificado";
  if (st === "nao_verificado" && !p.decision_maker) return null;
  return <span style={{ color: STATUS_COLOR[st] }}>{st === "confirmado" ? "✓ contato confirmado" : st === "nao_verificado" ? "decisor identificado" : `⚠ ${CONTACT_LABEL[st].toLowerCase()}`}</span>;
}

/** Validar contato: Google, link, CNPJ na Receita, decisor e o que a conversa confirmou. */
export function ContactCheck({ lead, onUpdated }: { lead: Prospect & ContactFields; onUpdated: (row: Partial<Prospect & ContactFields>) => void }) {
  const [cnpj, setCnpj] = useState(lead.cnpj ? formatCnpj(lead.cnpj) : "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [dm, setDm] = useState<DecisionMaker>(lead.decision_maker ?? { name: "", role: "", phone: "", email: "", source: "manual" });
  const company = lead.company_data;
  const link = lead.link_check?.website;
  const st = lead.contact_status ?? "nao_verificado";
  const city = (lead.query || "").split(" em ")[1] ?? "";

  const patch = async (body: Record<string, unknown>, ok: string) => {
    setMsg("");
    try { const row = await api<Prospect & ContactFields>(`/api/prospects/${lead.id}`, { method: "PATCH", body }); onUpdated(row); setMsg(`✓ ${ok}`); }
    catch (e) { setMsg(`⚠ ${(e as Error).message}`); }
  };
  const verify = async () => {
    setBusy(true); setMsg("");
    try {
      const row = await api<Prospect & ContactFields & { _warning?: string }>(`/api/prospects/${lead.id}/verify`, { body: { cnpj } });
      onUpdated(row); setMsg(row._warning ? `⚠ ${row._warning}` : "✓ Verificado.");
    } catch (e) { setMsg(`⚠ ${(e as Error).message}`); }
    setBusy(false);
  };
  const useAsDecisionMaker = (name: string, role: string) => setDm({ ...dm, name, role, source: "receita" });

  const closed = /CLOSED/.test(lead.business_status ?? "");
  const phoneMatch = company && lead.phone ? company.phones.some((ph) => samePhone(lead.phone, ph)) : null;
  const row = (k: string, v: React.ReactNode) => (
    <div style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13.5 }}>
      <span style={{ color: C.muted, width: 110, flexShrink: 0 }}>{k}</span><span style={{ minWidth: 0, wordBreak: "break-word" }}>{v}</span>
    </div>
  );

  return (
    <div>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: C.muted }}>
        O Google pode estar desatualizado. Confira por camadas: a empresa existe e está ativa, o link funciona, e quem decide.
      </p>

      {row("Google", closed ? <span style={{ color: "#B91C1C" }}>✕ marcado como fechado no Google</span> : <span style={{ color: C.green }}>✓ aberta no Google</span>)}
      {row("Telefone", lead.phone ? <>{lead.phone} · {whatsappNumber(lead.phone) ? "celular (pode ter WhatsApp)" : "fixo (sem WhatsApp)"}
        {phoneMatch === true && <span style={{ color: C.green }}> · ✓ confere com a Receita</span>}
        {phoneMatch === false && <span style={{ color: "#B45309" }}> · difere do cadastro na Receita</span>}</> : "sem telefone")}
      {row("Site / rede", lead.website ? <>
        <a href={lead.website} target="_blank" rel="noreferrer">{lead.website.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)}</a>
        {link ? <span style={{ color: LINK_TEXT[link.state][1] }}> · {LINK_TEXT[link.state][0]}</span> : <span style={{ color: C.muted }}> · ainda não verificado</span>}
      </> : "não tem")}

      <div style={{ marginTop: 12 }}>
        <label style={label} htmlFor={`cnpj-${lead.id}`}>CNPJ</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input id={`cnpj-${lead.id}`} inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00"
            style={{ ...input, flex: "1 1 180px", width: "auto" }} />
          <button type="button" disabled={busy} onClick={verify} style={btn(C.teal, "#fff", { flex: "1 1 auto" })}>{busy ? "Verificando…" : cnpj.trim() ? "Verificar e consultar Receita" : "Verificar link"}</button>
        </div>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "6px 0 0" }}>
          Não sabe o CNPJ? <a href={`https://www.google.com/search?q=${encodeURIComponent(`"${lead.name}" ${city} CNPJ`)}`} target="_blank" rel="noreferrer">procurar no Google</a>
          {" "}(costuma estar no rodapé do site, na bio do Instagram ou na nota fiscal).
        </p>
      </div>

      {company && (
        <div className="card" style={{ padding: 12, marginTop: 12, background: C.panel2 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{company.legal_name}{company.trade_name ? ` · ${company.trade_name}` : ""}</div>
          <div style={{ fontSize: 13, marginTop: 2 }}>
            <span style={{ color: company.status === "ATIVA" ? C.green : "#B91C1C", fontWeight: 600 }}>{company.status === "ATIVA" ? "✓ ATIVA na Receita" : `✕ ${company.status} na Receita`}</span>
            {company.opened_at && <span style={{ color: C.muted }}> · desde {company.opened_at.slice(0, 4)}</span>}
            {company.mei && <span style={{ color: C.muted }}> · MEI</span>}
          </div>
          {(company.phones.length > 0 || company.email) && (
            <div style={{ fontSize: 13, color: C.body, marginTop: 6 }}>Cadastro: {[...company.phones.map((x) => x.replace(/^(\d{2})(\d+)(\d{4})$/, "($1) $2-$3")), company.email].filter(Boolean).join(" · ")}
              <span style={{ color: C.muted }}> (muitas vezes é do contador)</span></div>
          )}
          {company.partners.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12.5, color: C.muted }}>Quem decide (quadro de sócios):</div>
              {company.partners.map((pt) => (
                <div key={pt.name} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", fontSize: 13.5 }}>
                  <span style={{ flex: 1, minWidth: 0 }}><strong style={{ fontWeight: pt.decision_maker ? 700 : 500 }}>{pt.name}</strong> <span style={{ color: C.muted }}>· {pt.role}</span></span>
                  <button type="button" onClick={() => useAsDecisionMaker(pt.name, pt.role)} style={btn("#fff", C.teal, { border: `1px solid ${C.border}`, padding: "4px 10px", minHeight: 30, fontSize: 12.5 })}>Usar</button>
                </div>
              ))}
            </div>
          )}
          {company.mei && company.partners.length === 0 && <p style={{ fontSize: 13, margin: "6px 0 0" }}>MEI: o próprio titular decide — o nome está na razão social.</p>}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Tomador de decisão</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
          <input aria-label="Nome do decisor" value={dm.name} onChange={(e) => setDm({ ...dm, name: e.target.value })} placeholder="Nome" style={input} />
          <input aria-label="Cargo" value={dm.role} onChange={(e) => setDm({ ...dm, role: e.target.value })} placeholder="Cargo (ex: dona)" style={input} />
          <input aria-label="Celular do decisor" type="tel" value={dm.phone} onChange={(e) => setDm({ ...dm, phone: e.target.value })} placeholder="Celular direto (se souber)" style={input} />
        </div>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "6px 0 8px" }}>
          O celular direto vem da conversa (“falo com quem cuida do marketing?”), nunca de lista comprada. Com celular aqui, o WhatsApp vai direto para ele.
        </p>
        <button type="button" disabled={dm.name.trim().length < 2} onClick={() => patch({ decision_maker: { ...dm, source: dm.source === "receita" && dm.phone ? "conversa" : dm.source } }, "Decisor salvo.")}
          style={btn(C.teal)}>Salvar decisor</button>
        {lead.decision_maker && <button type="button" onClick={() => { setDm({ name: "", role: "", phone: "", email: "", source: "manual" }); patch({ decision_maker: null }, "Decisor removido."); }}
          style={btn("transparent", C.muted, { marginLeft: 6 })}>Remover</button>}
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Resultado <span style={{ fontWeight: 400, color: STATUS_COLOR[st], fontSize: 13 }}>· {CONTACT_LABEL[st]}</span></div>
        <div className="lead-actions">
          <button type="button" onClick={() => patch({ contact_status: "confirmado" }, "Contato confirmado.")} style={btn(st === "confirmado" ? C.green : "#fff", st === "confirmado" ? "#fff" : C.body, { border: `1px solid ${C.border}` })}>Confirmado</button>
          <button type="button" onClick={() => patch({ contact_status: "sem_whatsapp" }, "Marcado: sem WhatsApp.")} style={btn(st === "sem_whatsapp" ? "#B45309" : "#fff", st === "sem_whatsapp" ? "#fff" : C.body, { border: `1px solid ${C.border}` })}>Sem WhatsApp</button>
          <button type="button" onClick={() => patch({ contact_status: "invalido" }, "Marcado: número inválido.")} style={btn(st === "invalido" ? "#B91C1C" : "#fff", st === "invalido" ? "#fff" : C.body, { border: `1px solid ${C.border}` })}>Número inválido</button>
        </div>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "6px 0 0" }}>Inválido ou sem WhatsApp sai da fila de Abordagem.</p>
      </div>
      {msg && <p role="status" style={{ fontSize: 13, margin: "10px 0 0", color: msg.startsWith("✓") ? C.green : "#B91C1C" }}>{msg}</p>}
    </div>
  );
}
