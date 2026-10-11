"use client";
import { useEffect, useMemo, useState } from "react";
import { api, copyText } from "@/lib/api";
import { buildMessage, cooldownMs, isDue, MAX_STEP, stageOf, stepDates, waLink, type OutreachCtx } from "@/lib/outreach";
import { C, btn, input, primary } from "./styles";
import type { Prospect } from "./Radar";
import { firstName } from "@/lib/contact";
import { whatsappNumber } from "@/lib/site";

export type Sender = { name?: string; consultant?: string };
type Event = { step: number; channel: string; kind: string; message: string; created_by: string; created_at: string };

const STEP_LABEL: Record<number, string> = { 1: "1º contato", 2: "Lembrete (2º dia)", 3: "Último lembrete (5º dia)" };
const fmt = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Escrever e enviar pelo WhatsApp (1 a 1), registrar o contato e marcar resposta. */
export function OutreachComposer({ lead, sender, leaderReviews, onUpdated, onAction, locked }: {
  lead: Prospect & { contact_step?: number | null; next_followup_at?: string | null };
  sender: Sender; leaderReviews?: number;
  onUpdated: (p: Partial<Prospect>) => void;
  onAction?: (kind: "enviado" | "respondeu" | "sem_interesse") => void;
  locked?: string; // motivo para segurar o envio (intervalo do modo sequência)
}) {
  const nextStep = Math.min(MAX_STEP, (lead.contact_step ?? 0) + 1);
  const [step, setStep] = useState(nextStep);
  const [siteUrl, setSiteUrl] = useState("");
  const [text, setText] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [msg, setMsg] = useState("");
  const done = (lead.contact_step ?? 0) >= MAX_STEP;

  // Decisor confirmado: cumprimenta pelo nome e, se houver celular direto, manda para ele.
  const dm = lead.decision_maker;
  const ctx: OutreachCtx = { sender: sender.consultant, agency: sender.name, siteUrl, leaderReviews, contactName: firstName(dm?.name) || undefined };
  const toPhone = dm?.phone && whatsappNumber(dm.phone) ? dm.phone : lead.phone;
  useEffect(() => {
    if (!lead.id) return;
    api<{ site: { slug: string; url?: string } | null }>(`/api/sites?prospectId=${lead.id}`)
      .then((r) => r.site && setSiteUrl(r.site.url || `${window.location.origin}/s/${r.site.slug}`)).catch(() => {});
    api<Event[]>(`/api/prospects/${lead.id}/outreach`).then(setEvents).catch(() => {});
  }, [lead.id]);
  // Regera o texto quando muda o passo ou chega o link do site (o usuário pode editar depois).
  useEffect(() => { setText(buildMessage(lead, step, ctx)); }, [step, siteUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const link = waLink(toPhone, text);
  const record = async (kind: "enviado" | "respondeu" | "sem_interesse", channel = "whatsapp") => {
    if (!lead.id) return;
    try {
      const row = await api<Prospect>(`/api/prospects/${lead.id}/outreach`, { method: "POST", body: { kind, step, channel, message: kind === "enviado" ? text : "" } });
      onUpdated(row);
      onAction?.(kind);
      setEvents(await api<Event[]>(`/api/prospects/${lead.id}/outreach`));
      setMsg(kind === "enviado" ? `✓ Registrado. ${step < MAX_STEP ? "Lembrete agendado." : "Sequência concluída."}` : "✓ Atualizado.");
      if (kind === "enviado" && step < MAX_STEP) setStep(step + 1);
    } catch (e) { setMsg(`⚠ ${(e as Error).message}`); }
  };

  // Abre o WhatsApp na mesma ação do clique (para o navegador não bloquear) e registra em seguida.
  const send = () => { if (!link) return; window.open(link, "_blank", "noopener"); record("enviado"); };

  return (
    <div>
      <div className="seg" role="tablist" aria-label="Mensagem" style={{ marginBottom: 8 }}>
        {[1, 2, 3].map((s) => (
          <button key={s} type="button" role="tab" aria-selected={step === s} onClick={() => setStep(s)}>
            {s === 1 ? "1º contato" : s === 2 ? "Lembrete" : "Último"}{(lead.contact_step ?? 0) >= s ? " ✓" : ""}
          </button>
        ))}
      </div>
      {lead.next_followup_at && (
        <p style={{ fontSize: 12.5, color: isDue(lead.next_followup_at) ? C.red : C.muted, margin: "0 0 6px" }}>
          {isDue(lead.next_followup_at) ? "Lembrete para hoje" : `Próximo lembrete: ${fmt(lead.next_followup_at)}`}
        </p>
      )}
      <textarea aria-label="Mensagem" value={text} onChange={(e) => setText(e.target.value)} rows={6}
        style={{ ...input, fontSize: 14, lineHeight: 1.55, resize: "vertical" }} />

      {link ? (
        <button type="button" onClick={send} disabled={!!locked || (done && step <= (lead.contact_step ?? 0))} title={locked ?? ""}
          style={btn(locked ? C.border : "#16A34A", locked ? C.dim : "#fff", { width: "100%", marginTop: 10, minHeight: 46, fontSize: 15 })}>Enviar no WhatsApp</button>
      ) : (
        <div style={{ marginTop: 10 }}>
          <span style={{ fontSize: 13, color: C.amber }}>Telefone fixo: sem WhatsApp. </span>
          {lead.phone && <a href={`tel:${lead.phone.replace(/\D/g, "")}`} onClick={() => record("enviado", "ligacao")} style={{ ...btn(primary), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Ligar e registrar</a>}
        </div>
      )}
      {dm?.name && <p style={{ fontSize: 12.5, color: C.muted, margin: "6px 0 0" }}>Para: {dm.name}{dm.role ? ` (${dm.role})` : ""}{toPhone !== lead.phone ? " · celular direto" : ""}</p>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
        <button type="button" onClick={() => record("respondeu")} style={btn(C.panel, C.body, { border: `1px solid ${C.border}`, flex: 1 })}>Respondeu</button>
        <button type="button" onClick={() => confirm("Marcar como sem interesse? O lead sai da fila e não recebe mais lembretes.") && record("sem_interesse")}
          style={btn(C.panel, C.body, { border: `1px solid ${C.border}`, flex: 1 })}>Sem interesse</button>
        <button type="button" onClick={async () => setMsg((await copyText(text)) ? "✓ Mensagem copiada." : "⚠ Não deu para copiar.")} style={btn(C.panel, C.body, { border: `1px solid ${C.border}`, flex: 1 })}>Copiar</button>
      </div>
      <button type="button" onClick={async () => {
        if (!lead.id || !confirm("O WhatsApp disse que este número não tem conta? O lead sai da fila.")) return;
        try { const row = await api<Prospect>(`/api/prospects/${lead.id}`, { method: "PATCH", body: { contact_status: "sem_whatsapp" } }); onUpdated(row); onAction?.("sem_interesse"); setMsg("✓ Marcado: sem WhatsApp."); }
        catch (e) { setMsg(`⚠ ${(e as Error).message}`); }
      }} style={btn("transparent", C.muted, { marginTop: 4, fontSize: 12.5, padding: "4px 0", minHeight: 28 })}>Número não tem WhatsApp</button>
      {msg && <p role="status" style={{ fontSize: 12, color: msg.startsWith("✓") ? C.green : C.red, margin: "8px 0 0" }}>{msg}</p>}

      {events.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 12, color: C.muted, cursor: "pointer" }}>Histórico ({events.length})</summary>
          {events.map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: C.body, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <strong>{e.kind === "enviado" ? `${STEP_LABEL[e.step] ?? "Contato"}${e.channel === "ligacao" ? " (ligação)" : ""}` : e.kind === "respondeu" ? "Respondeu" : "Sem interesse"}</strong>
              <span style={{ color: C.muted }}> · {fmt(e.created_at)} · {e.created_by || "—"}</span>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

type QLead = Prospect & { contact_step?: number | null; next_followup_at?: string | null; sent: Record<number, string> };
type Queue = { leads: QLead[]; sentToday: number; sentTodayMine: number; leaders: Record<string, number> };
type Stage = "all" | 1 | 2 | 3 | 4;
const GOAL_KEY = "seo_daily_goal";
const SEQ_MAX = 40;
const STAGE_LABEL: Record<1 | 2 | 3 | 4, string> = { 1: "1º contato", 2: "Lembrete 2º dia", 3: "Último lembrete", 4: "Concluídos sem resposta" };
const STAGE_COLOR: Record<1 | 2 | 3 | 4, string> = { 1: C.blue, 2: C.amber, 3: C.orange, 4: C.muted };
const DATE_LABEL: Record<number, string> = { 1: "1º contato", 2: "Lembrete 2º dia", 3: "Último" };
const day = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

/** Pronto para hoje: novo, ou lembrete cujo dia já chegou. */
const ready = (l: QLead) => { const st = stageOf(l.contact_step); return st === 1 || (st < 4 && isDue(l.next_followup_at)); };

function StepDates({ l }: { l: QLead }) {
  const dates = stepDates(l.contact_step, l.sent ?? {}, l.next_followup_at);
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11.5, marginTop: 4 }}>
      {dates.map((d) => {
        const late = !d.done && d.date && isDue(d.date);
        return (
          <span key={d.step} style={{ color: d.done ? C.green : late ? C.red : C.muted }}>
            {DATE_LABEL[d.step]}: <strong>{d.date ? day(d.date) : d.step === 1 ? "hoje" : "—"}</strong>
            {d.done ? " ✓ enviado" : late ? " vencido" : d.date ? " (previsto)" : ""}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Fila de abordagem por etapa. Envio sempre 1 a 1: no modo sequência cada mensagem exige um clique
 * e há um intervalo de 45–90 s entre envios, para o WhatsApp não tratar como disparo em massa.
 */
export function OutreachQueue({ projectId = "", sender, onUpdated }: { projectId?: string; sender: Sender; onUpdated: () => void }) {
  const [q, setQ] = useState<Queue | null>(null);
  const [project, setProject] = useState(projectId);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => { api<{ id: string; name: string }[]>("/api/projects").then(setProjects).catch(() => {}); }, []);
  const [open, setOpen] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("all");
  const [onlyReady, setOnlyReady] = useState(true);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [seq, setSeq] = useState<{ ids: string[]; i: number; until: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [goal, setGoal] = useState(() => { try { return Number(localStorage.getItem(GOAL_KEY)) || 20; } catch { return 20; } });
  const [err, setErr] = useState("");

  const load = () => api<Queue>(`/api/outreach${project ? `?project=${project}` : ""}`).then(setQ).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [project]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { localStorage.setItem(GOAL_KEY, String(goal)); } catch { /* sem armazenamento */ } }, [goal]);
  useEffect(() => { if (!seq || seq.until <= Date.now()) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [seq]);

  const counts = useMemo(() => {
    const c: Record<1 | 2 | 3 | 4, { all: number; ready: number }> = { 1: { all: 0, ready: 0 }, 2: { all: 0, ready: 0 }, 3: { all: 0, ready: 0 }, 4: { all: 0, ready: 0 } };
    for (const l of q?.leads ?? []) { const st = stageOf(l.contact_step); c[st].all++; if (ready(l)) c[st].ready++; }
    return c;
  }, [q]);
  const visible = useMemo(() => (q?.leads ?? [])
    .filter((l) => (stage === "all" ? stageOf(l.contact_step) < 4 : stageOf(l.contact_step) === stage))
    .filter((l) => !onlyReady || stage === 4 || ready(l))
    .sort((a, b) => {
      const sa = stageOf(a.contact_step), sb = stageOf(b.contact_step);
      if (sa !== sb) return sb - sa; // lembretes primeiro (quem já conversou)
      return sa === 1 ? b.score - a.score : (a.next_followup_at ?? "").localeCompare(b.next_followup_at ?? "");
    }), [q, stage, onlyReady]);

  if (err) return <p style={{ color: C.red, fontSize: 13 }}>⚠ {err}</p>;
  if (!q) return <p style={{ color: C.dim, fontSize: 13 }}>Carregando a fila…</p>;
  const pct = Math.min(100, Math.round((100 * q.sentTodayMine) / Math.max(1, goal)));
  const byId = (id: string) => q.leads.find((l) => l.id === id);
  const refresh = () => { onUpdated(); setTimeout(load, 300); };
  const selectable = visible.filter((l) => l.id && waLink(l.phone, "x") && stageOf(l.contact_step) < 4);
  const allSel = selectable.length > 0 && selectable.slice(0, SEQ_MAX).every((l) => sel.has(l.id!));
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.size < SEQ_MAX && n.add(id); return n; });

  const startSeq = () => {
    const ids = visible.filter((l) => l.id && sel.has(l.id)).map((l) => l.id!);
    if (ids.length) { setSeq({ ids, i: 0, until: 0 }); setOpen(null); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };
  const wait = seq ? Math.max(0, Math.ceil((seq.until - now) / 1000)) : 0;
  const current = seq ? byId(seq.ids[seq.i]) : undefined;
  const advance = () => setSeq((s) => (s && s.i + 1 < s.ids.length ? { ...s, i: s.i + 1 } : null));

  const row = (p: QLead) => {
    const st = stageOf(p.contact_step);
    return (
      <div key={p.place_id} className="card" style={{ marginBottom: 8, overflow: "hidden" }}>
        <div className="prospect-row" style={{ cursor: "pointer" }} onClick={() => setOpen(open === p.place_id ? null : p.place_id)}>
          {st < 4 && p.id && (
            <input type="checkbox" aria-label={`Selecionar ${p.name}`} checked={sel.has(p.id)} disabled={!waLink(p.phone, "x")}
              onClick={(e) => e.stopPropagation()} onChange={() => toggle(p.id!)} style={{ width: 20, height: 20, cursor: "pointer", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
            <div style={{ fontSize: 12.5, color: STAGE_COLOR[st], fontWeight: 600, marginTop: 2 }}>{STAGE_LABEL[st]}</div>
            {st > 1 && <StepDates l={p} />}
          </div>
          <span aria-hidden style={{ color: C.faint, fontSize: 14 }}>{open === p.place_id ? "▴" : "▾"}</span>
        </div>
        {open === p.place_id && (
          <div style={{ padding: "0 12px 14px" }}>
            <OutreachComposer lead={p} sender={sender} leaderReviews={q.leaders[p.query]} onUpdated={refresh} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="card" style={{ padding: "12px 14px", marginBottom: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 180px" }}>
          <div style={{ fontSize: 13, color: C.muted }}>Enviadas hoje</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{q.sentTodayMine}<span style={{ fontSize: 13, color: C.muted, fontWeight: 400 }}> de {goal}</span></div>
          <div style={{ height: 5, background: C.panel2, borderRadius: 3, marginTop: 6 }}><div style={{ width: `${pct}%`, height: "100%", background: "#16A34A", borderRadius: 3 }} /></div>
        </div>
        <div style={{ flex: "1 1 180px", fontSize: 13.5, color: C.body, lineHeight: 1.6 }}>
          <strong>{counts[1].ready}</strong> novos para chamar<br />
          <strong style={{ color: counts[2].ready + counts[3].ready ? C.red : C.text }}>{counts[2].ready + counts[3].ready}</strong> lembretes para hoje
        </div>
        <details style={{ flex: "0 0 auto" }}>
          <summary style={{ cursor: "pointer", fontSize: 12.5, color: C.muted }}>Meta e projeto</summary>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <label style={{ fontSize: 13, color: C.body, display: "flex", gap: 6, alignItems: "center" }}>Meta diária
              <input type="number" min={1} max={200} value={goal} onChange={(e) => setGoal(Number(e.target.value) || 1)} style={{ ...input, width: 80, padding: "4px 8px" }} />
            </label>
            {projects.length > 0 && (
              <select aria-label="Projeto" value={project} onChange={(e) => setProject(e.target.value)} style={{ ...input, padding: "6px 8px" }}>
                <option value="">Todos os projetos</option>
                {projects.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
              </select>
            )}
          </div>
        </details>
      </div>

      {seq && (
        <div className="dash-card" style={{ marginBottom: 16, borderColor: "#16A34A" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>Sequência {seq.i + 1} de {seq.ids.length}{current ? ` — ${current.name}` : ""}</strong>
            <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button type="button" onClick={advance} disabled={wait > 0} style={btn(primary, C.onAccent, { fontSize: 12 })}>
                {wait > 0 ? `Próximo em ${wait}s` : seq.i + 1 < seq.ids.length ? "Próximo →" : "Concluir"}</button>
              <button type="button" onClick={() => setSeq(null)} style={btn("transparent", C.dim, { border: `1px solid ${C.border}`, fontSize: 12 })}>Encerrar</button>
            </span>
          </div>
          {q.sentTodayMine >= goal && (
            <p style={{ fontSize: 12, color: C.amber, margin: "0 0 10px" }}>⚠ Você já bateu a meta de hoje ({goal}). Muitas mensagens novas no mesmo dia aumentam o risco de bloqueio do número.</p>
          )}
          {wait > 0 ? (
            <p style={{ fontSize: 13, color: C.body, margin: 0 }}>✓ Enviada. A próxima libera em <strong>{wait}s</strong> — use o intervalo para responder quem retornou.</p>
          ) : current ? (
            <OutreachComposer key={`${current.id}-${current.contact_step ?? 0}`} lead={current} sender={sender} leaderReviews={q.leaders[current.query]}
              onUpdated={refresh}
              onAction={(kind) => {
                setSel((s) => { const n = new Set(s); n.delete(current.id!); return n; });
                if (kind === "enviado") { setNow(Date.now()); setSeq((s) => s && { ...s, until: Date.now() + cooldownMs() }); }
                else advance();
              }} />
          ) : <p style={{ fontSize: 13, color: C.dim, margin: 0 }}>Este lead saiu da fila. Clique em Próximo.</p>}
        </div>
      )}

      <div className="chips" style={{ marginBottom: 10 }}>
        {(["all", 1, 2, 3, 4] as Stage[]).map((st) => {
          const n = st === "all" ? counts[1].ready + counts[2].ready + counts[3].ready : onlyReady && st !== 4 ? counts[st].ready : counts[st].all;
          const on = stage === st;
          return (
            <button key={st} type="button" aria-pressed={on} onClick={() => { setStage(st); setSel(new Set()); }}
              style={btn(on ? C.tealWash : C.panel, on ? C.teal : C.body, { border: `1px solid ${on ? C.tealLine : C.border}`, borderRadius: 999, flexShrink: 0 })}>
              {st === "all" ? "Hoje" : st === 4 ? "Sem resposta" : STAGE_LABEL[st]} · {n}
            </button>
          );
        })}
        <button type="button" aria-pressed={!onlyReady} onClick={() => setOnlyReady(!onlyReady)}
          style={btn(C.panel, C.muted, { border: `1px dashed ${C.border}`, borderRadius: 999, flexShrink: 0 })}>{onlyReady ? "Ver agendados" : "Só os de hoje"}</button>
      </div>

      {stage !== 4 && selectable.length > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, color: C.body, cursor: "pointer" }}>
            <input type="checkbox" checked={allSel}
              onChange={() => setSel(allSel ? new Set() : new Set(selectable.slice(0, SEQ_MAX).map((l) => l.id!)))} />
            Todos{selectable.length > SEQ_MAX ? ` (até ${SEQ_MAX})` : ""}
          </label>
          <button type="button" disabled={!sel.size || !!seq} onClick={startSeq} style={btn(sel.size ? "#16A34A" : C.border, sel.size ? "#fff" : C.dim, { flex: "1 1 auto" })}>
            Enviar um por um ({sel.size})
          </button>
        </div>
      )}

      {visible.length ? visible.map(row) : (
        <p style={{ color: C.dim, fontSize: 13 }}>
          {stage === 1 || stage === "all" ? "Ninguém para chamar hoje. Busque empresas em Buscar ou toque em “Ver agendados”." : "Nada nesta etapa."}
        </p>
      )}
    </div>
  );
}
