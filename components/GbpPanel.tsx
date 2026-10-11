"use client";
import { useCallback, useEffect, useState } from "react";
import { api, copyText } from "@/lib/api";
import { assistedText, DESCRIPTION_MAX, GBP_HOME, KIND_INFO, POST_MAX, type GbpAction } from "@/lib/gbp";
import { clientWaLink } from "@/lib/proposal";
import { C, btn, input, label, primary } from "./styles";

type Loaded = {
  configured: boolean;
  connection: { email: string; connected_at: string } | null;
  profile: { account: string; location: string; title: string | null } | null;
  site: { url: string; external: boolean };
  actions: GbpAction[];
};
type Loc = { account: string; location: string; title: string; address: string; website: string };
type Report = { period: { start: string; end: string }; now: Record<string, number>; before: Record<string, number>; done: string[]; message: string; phone: string };

const GOOGLE_MSG: Record<string, string> = {
  ok: "Conta Google conectada.", cancelado: "Conexão cancelada no Google.", expirou: "O pedido de conexão expirou. Tente de novo.",
  sem_permissao: "Só o administrador conecta a conta Google.", erro: "O Google não concluiu a conexão. Tente de novo.",
};
const STATUS: Record<GbpAction["status"], [string, string]> = {
  pendente: ["Pendente", C.muted], aplicada: ["Aplicada", C.green], falhou: ["Falhou", C.red], ignorada: ["Ignorada", C.faint],
};
const day = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
const limitOf = (k: GbpAction["kind"]) => (k === "descricao" ? DESCRIPTION_MAX : k === "post" ? POST_MAX : 0);

/**
 * Entrega › Perfil do Google: cada sugestão vira uma ação. Com a conta Google conectada e o perfil escolhido,
 * "Aplicar" muda o perfil pela API; sem isso, "Copiar e abrir no Google" deixa a mudança pronta para colar.
 */
export function GbpPanel({ clientId, isAdmin, aiEnabled }: { clientId: string | null; isAdmin: boolean; aiEnabled: boolean }) {
  const [d, setD] = useState<Loaded | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [locs, setLocs] = useState<Loc[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(() => {
    if (!clientId) return;
    api<Loaded>(`/api/gbp?clientId=${clientId}`).then(setD).catch((e) => setErr(e.message));
  }, [clientId]);
  useEffect(load, [load]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("google");
    if (q && GOOGLE_MSG[q]) { setMsg(GOOGLE_MSG[q]); window.history.replaceState(null, "", window.location.pathname); }
  }, []);

  if (!clientId) return <p style={{ color: C.amber, fontSize: 13 }}>Conclua a etapa 1 (Cliente) com o banco ligado para usar a fila do Perfil do Google.</p>;
  if (err && !d) return <p role="alert" style={{ color: C.red, fontSize: 13 }}>{err}</p>;
  if (!d) return <p style={{ color: C.dim, fontSize: 13 }}>Carregando o Perfil do Google…</p>;

  const live = !!(d.connection && d.profile);
  const run = async (key: string, f: () => Promise<string | void>) => {
    setBusy(key); setErr(""); setMsg("");
    try { const m = await f(); if (m) setMsg(m); load(); } catch (e) { setErr((e as Error).message); }
    setBusy("");
  };
  const patch = (a: GbpAction, body: Record<string, unknown>, m: string) => run(a.id, async () => { await api(`/api/gbp/actions/${a.id}`, { method: "PATCH", body }); return m; });
  const apply = (a: GbpAction) => run(a.id, async () => {
    const r = await api<GbpAction>(`/api/gbp/actions/${a.id}`, { method: "POST" });
    if (r.status === "falhou") throw new Error(r.error ?? "O Google recusou a mudança.");
    return `${KIND_INFO[a.kind].label}: aplicada no Google.`;
  });
  const assisted = async (a: GbpAction) => {
    const ok = await copyText(assistedText(a));
    window.open(GBP_HOME, "_blank", "noopener");
    setOpen(a.id); setDraft("");
    setMsg(ok ? `Texto copiado. No Google: ${KIND_INFO[a.kind].where}. Depois marque como feita.` : "Não deu para copiar; selecione o texto abaixo.");
  };

  const now = Date.now();
  const pending = d.actions.filter((a) => a.status === "pendente" || a.status === "falhou");
  const done = d.actions.filter((a) => a.status === "aplicada" || a.status === "ignorada");
  const applicableNow = pending.filter((a) => KIND_INFO[a.kind].api && (!a.scheduled_for || Date.parse(a.scheduled_for) <= now));
  const applyAll = () => run("all", async () => {
    let okN = 0, bad = 0;
    for (const a of applicableNow) {
      try { const r = await api<GbpAction>(`/api/gbp/actions/${a.id}`, { method: "POST" }); if (r.status === "aplicada") okN++; else bad++; } catch { bad++; }
    }
    return `${okN} aplicada${okN === 1 ? "" : "s"} no Google${bad ? ` · ${bad} com erro (veja na lista)` : ""}.`;
  });

  return (
    <div className="dash-card" style={{ marginBottom: 18 }}>
      <h3 className="dash-title">Perfil do Google</h3>
      <p className="dash-sub">Cada sugestão vira uma ação. Revise o texto e aplique: pela API quando o perfil estiver conectado, ou copiando e colando no Google.</p>

      {/* Conexão */}
      <div style={{ background: C.panel2, borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>
        {!d.configured ? (
          <span style={{ color: C.body }}><strong>Modo assistido.</strong> Para aplicar sem copiar e colar, o administrador configura a conexão com o Google (veja <code>docs/perfil-google.md</code>).</span>
        ) : !d.connection ? (
          <span style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ flex: "1 1 220px", color: C.body }}>Conecte a conta Google da agência (a que é <strong>Gerente</strong> dos perfis dos clientes).</span>
            {isAdmin ? <a href="/api/google/connect" style={{ ...btn(primary), textDecoration: "none" }}>Conectar conta Google</a>
              : <span style={{ color: C.muted }}>Peça ao administrador.</span>}
          </span>
        ) : (
          <span style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ flex: "1 1 220px", color: C.body }}>
              Google: <strong>{d.connection.email || "conta conectada"}</strong> ·{" "}
              {d.profile ? <>perfil <strong>{d.profile.title || d.profile.location}</strong></> : <span style={{ color: C.amber }}>escolha o perfil deste cliente</span>}
            </span>
            <button type="button" disabled={busy === "locs"} onClick={() => run("locs", async () => { setLocs(await api<Loc[]>("/api/google/locations")); })}
              style={btn(C.panel, C.body, { border: `1px solid ${C.border}` })}>{busy === "locs" ? "Buscando…" : d.profile ? "Trocar perfil" : "Escolher perfil"}</button>
          </span>
        )}
        {locs && (
          <div style={{ marginTop: 10 }}>
            {!locs.length && <p style={{ margin: 0, color: C.amber }}>A conta conectada não gerencia nenhum perfil. Peça ao cliente para adicioná-la como Gerente.</p>}
            {locs.map((l) => (
              <button key={l.location} type="button" onClick={() => run("link", async () => {
                await api("/api/gbp", { method: "PUT", body: { clientId, account: l.account, location: l.location, title: l.title } }); setLocs(null); return `Perfil ligado: ${l.title}.`;
              })} style={{ display: "block", width: "100%", textAlign: "left", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", marginTop: 6, cursor: "pointer", color: C.text }}>
                <strong style={{ fontSize: 13.5 }}>{l.title}</strong><span style={{ display: "block", fontSize: 12, color: C.muted }}>{l.address || l.location}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ações da fila */}
      <div className="lead-actions" style={{ marginBottom: 12 }}>
        <button type="button" disabled={!aiEnabled || !!busy} title={aiEnabled ? "" : "Configure ANTHROPIC_API_KEY"} onClick={() => run("plan", async () => {
          const r = await api<{ created: number }>("/api/gbp/plan", { body: { clientId } }); return `${r.created} ações na fila.`;
        })} style={btn(primary)}>{busy === "plan" ? "Montando a fila…" : d.actions.length ? "Remontar fila com os textos" : "Montar fila com os textos desta etapa"}</button>
        {live && <button type="button" disabled={!aiEnabled || !!busy} onClick={() => run("rev", async () => {
          const r = await api<{ created: number }>("/api/gbp/reviews", { body: { clientId } });
          return r.created ? `${r.created} avaliações sem resposta: rascunhos na fila para revisar.` : "Nenhuma avaliação sem resposta.";
        })} style={btn(C.panel, C.body, { border: `1px solid ${C.border}` })}>{busy === "rev" ? "Lendo avaliações…" : "Responder avaliações"}</button>}
        {live && applicableNow.length > 1 && <button type="button" disabled={!!busy} onClick={applyAll}
          style={btn(C.panel, C.teal, { border: `1px solid ${C.tealLine}` })}>{busy === "all" ? "Aplicando…" : `Aplicar ${applicableNow.length} agora`}</button>}
      </div>

      {msg && <p role="status" style={{ color: C.green, fontSize: 13, margin: "0 0 10px" }}>{msg}</p>}
      {err && <p role="alert" style={{ color: C.red, fontSize: 13, margin: "0 0 10px" }}>{err}</p>}

      {!d.actions.length && <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Fila vazia. Gere abaixo a Descrição, os Serviços e o Calendário de posts, e depois monte a fila.</p>}

      {pending.map((a) => {
        const info = KIND_INFO[a.kind];
        const text = assistedText(a);
        const editing = open === a.id;
        const max = limitOf(a.kind);
        const future = a.scheduled_for && Date.parse(a.scheduled_for) > now;
        return (
          <div key={a.id} role="group" aria-label={`${info.label}: ${a.title}`} style={{ borderTop: `1px solid ${C.border}`, padding: "10px 0" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.teal }}>{info.label}</span>
              <strong style={{ fontSize: 13.5, flex: "1 1 160px", minWidth: 0 }}>{a.title}</strong>
              {a.scheduled_for && <span style={{ fontSize: 12, color: C.muted }}>{future ? `agendado ${day(a.scheduled_for)}` : "vence hoje"}</span>}
              <span style={{ fontSize: 12, color: STATUS[a.status][1] }}>{STATUS[a.status][0]}</span>
            </div>
            {a.kind === "resposta_avaliacao" && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: C.muted }}>“{String(a.payload.comment || "sem comentário").slice(0, 220)}”</p>}
            {a.error && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: C.red }}>{a.error}</p>}
            {editing ? (
              <div style={{ marginTop: 8 }}>
                <textarea aria-label={`Texto: ${a.title}`} rows={a.kind === "servicos" ? 8 : 5} value={draft || text} onChange={(e) => setDraft(e.target.value)} readOnly={a.kind === "servicos"}
                  style={{ ...input, fontSize: 13.5, resize: "vertical" }} />
                {max > 0 && <p style={{ margin: "4px 0 0", fontSize: 12, color: (draft || text).length > max ? C.red : C.muted }}>{(draft || text).length} de {max} caracteres</p>}
                <div className="lead-actions" style={{ marginTop: 8 }}>
                  {a.kind !== "servicos" && <button type="button" disabled={!draft || draft === text} onClick={() => { patch(a, { text: draft }, "Texto salvo."); setDraft(""); }} style={btn(primary)}>Salvar texto</button>}
                  <button type="button" onClick={() => patch(a, { status: "aplicada" }, "Marcada como feita no Google.")} style={btn(C.panel, C.body, { border: `1px solid ${C.border}` })}>Marcar como feita</button>
                  <button type="button" onClick={() => { setOpen(null); setDraft(""); }} style={btn("transparent", C.muted)}>Fechar</button>
                </div>
              </div>
            ) : (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: C.body, whiteSpace: "pre-wrap", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{text}</p>
            )}
            {!editing && (
              <div className="lead-actions" style={{ marginTop: 8 }}>
                {info.api && live && <button type="button" disabled={!!busy} onClick={() => apply(a)} style={btn(primary)}>{busy === a.id ? "Aplicando…" : future ? "Publicar agora" : "Aplicar no Google"}</button>}
                <button type="button" onClick={() => assisted(a)} style={btn(C.panel, C.body, { border: `1px solid ${C.border}` })}>Copiar e abrir no Google</button>
                <button type="button" onClick={() => { setOpen(a.id); setDraft(""); }} style={btn(C.panel, C.body, { border: `1px solid ${C.border}` })}>Revisar texto</button>
                <button type="button" onClick={() => patch(a, { status: "ignorada" }, "Ação ignorada.")} style={btn("transparent", C.muted)}>Ignorar</button>
              </div>
            )}
          </div>
        );
      })}

      {done.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
          <button type="button" onClick={() => setShowDone(!showDone)} style={btn("transparent", C.muted, { padding: "4px 0" })}>
            {showDone ? "Esconder" : "Ver"} histórico ({done.length})
          </button>
          {showDone && done.map((a) => (
            <div key={a.id} style={{ display: "flex", gap: 8, fontSize: 12.5, padding: "4px 0", color: C.body, flexWrap: "wrap" }}>
              <span style={{ color: STATUS[a.status][1], width: 64 }}>{STATUS[a.status][0]}</span>
              <span style={{ flex: "1 1 200px", minWidth: 0 }}>{KIND_INFO[a.kind].label}: {a.title}</span>
              <span style={{ color: C.muted }}>{a.applied_at ? `${day(a.applied_at)} · ${a.applied_via === "api" ? "pela API" : "à mão"}` : ""}</span>
              {a.status === "ignorada" && <button type="button" onClick={() => patch(a, { status: "pendente" }, "De volta para a fila.")} style={btn("transparent", C.blue, { padding: 0, minHeight: 0, fontSize: 12.5 })}>Voltar para a fila</button>}
            </div>
          ))}
        </div>
      )}

      {/* Relatório mensal */}
      <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 10, paddingTop: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ flex: "1 1 220px" }}><strong style={{ fontSize: 14 }}>Relatório do mês</strong>
            <span style={{ display: "block", fontSize: 12.5, color: C.muted }}>Visualizações, ligações, rotas e cliques dos últimos 30 dias, com o que foi feito no perfil.</span></span>
          <button type="button" disabled={!live || !!busy} title={live ? "" : "Conecte o Google e escolha o perfil"} onClick={() => run("rep", async () => { setReport(await api<Report>(`/api/gbp/report?clientId=${clientId}`)); })}
            style={btn(live ? C.panel : C.border, live ? C.body : C.dim, { border: `1px solid ${C.border}` })}>{busy === "rep" ? "Buscando números…" : "Gerar relatório"}</button>
        </div>
        {report && (
          <div style={{ marginTop: 10 }}>
            <label style={label} htmlFor="gbp-report">Mensagem para o cliente ({report.period.start.split("-").reverse().join("/")} a {report.period.end.split("-").reverse().join("/")})</label>
            <textarea id="gbp-report" rows={10} value={report.message} onChange={(e) => setReport({ ...report, message: e.target.value })} style={{ ...input, fontSize: 13.5, resize: "vertical" }} />
            <div className="lead-actions" style={{ marginTop: 8 }}>
              {clientWaLink(report.phone, report.message)
                ? <a href={clientWaLink(report.phone, report.message)!} target="_blank" rel="noreferrer" style={{ ...btn("#16A34A", "#fff"), textDecoration: "none" }}>Enviar no WhatsApp</a>
                : <span style={{ fontSize: 12.5, color: C.muted }}>Sem celular do cliente na etapa 1.</span>}
              <button type="button" onClick={async () => setMsg((await copyText(report.message)) ? "Relatório copiado." : "Não deu para copiar.")} style={btn(C.panel, C.body, { border: `1px solid ${C.border}` })}>Copiar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
