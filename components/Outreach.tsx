"use client";
import { useEffect, useMemo, useState } from "react";
import { api, copyText } from "@/lib/api";
import { buildMessage, cooldownMs, isDue, MAX_STEP, stageOf, stepDates, waLink, type OutreachCtx } from "@/lib/outreach";
import { C, btn, input, primary } from "./styles";
import type { Prospect } from "./Radar";

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

  const ctx: OutreachCtx = { sender: sender.consultant, agency: sender.name, siteUrl, leaderReviews };
  useEffect(() => {
    if (!lead.id) return;
    api<{ site: { slug: string } | null }>(`/api/sites?prospectId=${lead.id}`)
      .then((r) => r.site && setSiteUrl(`${window.location.origin}/s/${r.site.slug}`)).catch(() => {});
    api<Event[]>(`/api/prospects/${lead.id}/outreach`).then(setEvents).catch(() => {});
  }, [lead.id]);
  // Regera o texto quando muda o passo ou chega o link do site (o usuário pode editar depois).
  useEffect(() => { setText(buildMessage(lead, step, ctx)); }, [step, siteUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const link = waLink(lead.phone, text);
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
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {[1, 2, 3].map((s) => (
          <button key={s} type="button" onClick={() => setStep(s)}
            style={btn(step === s ? "#16A34A" : C.panel2, step === s ? "#fff" : C.dim, { border: `1px solid ${step === s ? "#16A34A" : C.border}`, fontSize: 11 })}>
            {STEP_LABEL[s]}{(lead.contact_step ?? 0) >= s ? " ✓" : ""}
          </button>
        ))}
        {lead.next_followup_at && (
          <span style={{ fontSize: 11, color: isDue(lead.next_followup_at) ? "#F87171" : C.muted, alignSelf: "center" }}>
            {isDue(lead.next_followup_at) ? "⏰ lembrete vencido" : `próximo lembrete: ${fmt(lead.next_followup_at)}`}
          </span>
        )}
      </div>
      <textarea aria-label="Mensagem" value={text} onChange={(e) => setText(e.target.value)} rows={6}
        style={{ ...input, fontSize: 13, lineHeight: 1.55, resize: "vertical" }} />
      {!siteUrl && <p style={{ fontSize: 11.5, color: C.muted, margin: "6px 0 0" }}>Dica: gere o 🌐 Site de prévia antes, que o link entra na mensagem automaticamente.</p>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {link ? (
          <button type="button" onClick={send} disabled={!!locked || (done && step <= (lead.contact_step ?? 0))} title={locked ?? ""}
            style={btn(locked ? C.border : "#16A34A", locked ? C.dim : "#fff")}>📲 Abrir WhatsApp e registrar</button>
        ) : (
          <>
            <span style={{ fontSize: 12, color: "#FCD34D", alignSelf: "center" }}>Telefone fixo: sem WhatsApp.</span>
            {lead.phone && <a href={`tel:${lead.phone.replace(/\D/g, "")}`} onClick={() => record("enviado", "ligacao")} style={{ ...btn(primary), textDecoration: "none" }}>📞 Ligar e registrar</a>}
          </>
        )}
        <button type="button" onClick={async () => setMsg((await copyText(text)) ? "✓ Mensagem copiada." : "⚠ Não deu para copiar.")} style={btn(C.panel2, C.blue, { border: `1px solid ${C.border}` })}>Copiar</button>
        <button type="button" onClick={() => record("respondeu")} style={btn(C.panel2, "#F472B6", { border: `1px solid ${C.border}` })}>💬 Respondeu</button>
        <button type="button" onClick={() => confirm("Marcar como sem interesse? O lead vai para Descartado e não recebe mais lembretes.") && record("sem_interesse")}
          style={btn("transparent", C.dim, { border: `1px solid ${C.border}` })}>Sem interesse / pediu para parar</button>
      </div>
      {msg && <p role="status" style={{ fontSize: 12, color: msg.startsWith("✓") ? "#6EE7B7" : C.red, margin: "8px 0 0" }}>{msg}</p>}

      {events.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 12, color: C.muted, cursor: "pointer" }}>Histórico ({events.length})</summary>
          {events.map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: C.body, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <strong>{e.kind === "enviado" ? `${e.channel === "ligacao" ? "📞" : "📲"} ${STEP_LABEL[e.step] ?? "contato"}` : e.kind === "respondeu" ? "💬 Respondeu" : "🚫 Sem interesse"}</strong>
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
const STAGE_COLOR: Record<1 | 2 | 3 | 4, string> = { 1: "#60A5FA", 2: "#FBBF24", 3: "#F97316", 4: "#64748B" };
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
          <span key={d.step} style={{ color: d.done ? "#6EE7B7" : late ? "#F87171" : C.muted }}>
            {DATE_LABEL[d.step]}: <strong>{d.date ? day(d.date) : d.step === 1 ? "hoje" : "—"}</strong>
            {d.done ? " ✓ enviado" : late ? " ⏰ vencido" : d.date ? " (previsto)" : ""}
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
export function OutreachQueue({ projectId, sender, onUpdated }: { projectId: string; sender: Sender; onUpdated: () => void }) {
  const [q, setQ] = useState<Queue | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("all");
  const [onlyReady, setOnlyReady] = useState(true);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [seq, setSeq] = useState<{ ids: string[]; i: number; until: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [goal, setGoal] = useState(() => { try { return Number(localStorage.getItem(GOAL_KEY)) || 20; } catch { return 20; } });
  const [err, setErr] = useState("");

  const load = () => api<Queue>(`/api/outreach${projectId ? `?project=${projectId}` : ""}`).then(setQ).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps
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
      <div key={p.place_id} className="dash-card" style={{ marginBottom: 8, padding: 0 }}>
        <div className="prospect-row" style={{ cursor: "pointer" }} onClick={() => setOpen(open === p.place_id ? null : p.place_id)}>
          {st < 4 && p.id && (
            <input type="checkbox" aria-label={`Selecionar ${p.name}`} checked={sel.has(p.id)} disabled={!waLink(p.phone, "x")}
              onClick={(e) => e.stopPropagation()} onChange={() => toggle(p.id!)} style={{ width: 18, height: 18, cursor: "pointer" }} />
          )}
          <strong style={{ width: 34, textAlign: "center", color: "#A78BFA" }}>{p.score}</strong>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <strong style={{ fontSize: 14 }}>{p.name}</strong>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: STAGE_COLOR[st], border: `1px solid ${STAGE_COLOR[st]}`, borderRadius: 4, padding: "1px 6px" }}>{STAGE_LABEL[st]}</span>
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>{p.query} · {p.phone} · {p.issues.slice(0, 2).map((i) => i.label).join(", ") || "—"}</div>
            <StepDates l={p} />
          </div>
          <span style={{ color: C.dim, fontSize: 12 }}>{open === p.place_id ? "▲" : "▼"}</span>
        </div>
        {open === p.place_id && (
          <div style={{ padding: "0 16px 16px" }}>
            <OutreachComposer lead={p} sender={sender} leaderReviews={q.leaders[p.query]} onUpdated={refresh} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="kpis" style={{ marginBottom: 16 }}>
        <div className="kpi">
          <div style={{ fontSize: 11, color: C.muted }}>Suas mensagens hoje</div>
          <div style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 6px" }}>{q.sentTodayMine} <span style={{ fontSize: 13, color: C.muted, fontWeight: 400 }}>/ meta {goal} · equipe {q.sentToday}</span></div>
          <div style={{ height: 6, background: C.panel2, borderRadius: 3 }}><div style={{ width: `${pct}%`, height: "100%", background: "#16A34A", borderRadius: 3 }} /></div>
          <label style={{ fontSize: 11, color: C.dim, display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>Meta diária
            <input type="number" min={1} max={200} value={goal} onChange={(e) => setGoal(Number(e.target.value) || 1)} style={{ ...input, width: 70, padding: "3px 6px", fontSize: 12 }} />
          </label>
        </div>
        {([1, 2, 3] as const).map((st) => (
          <div key={st} className="kpi"><div style={{ fontSize: 11, color: C.muted }}>{STAGE_LABEL[st]}</div>
            <div style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 2px", color: st > 1 && counts[st].ready ? "#F87171" : C.text }}>{counts[st].ready}</div>
            <div style={{ fontSize: 11, color: C.dim }}>{st === 1 ? "novos com celular" : `para hoje · ${counts[st].all - counts[st].ready} agendados`}</div></div>
        ))}
      </div>

      {seq && (
        <div className="dash-card" style={{ marginBottom: 16, borderColor: "#16A34A" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>▶ Sequência: {seq.i + 1} de {seq.ids.length}{current ? ` — ${current.name}` : ""}</strong>
            <span style={{ fontSize: 11.5, color: C.muted }}>Um clique por mensagem, com intervalo entre envios.</span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button type="button" onClick={advance} disabled={wait > 0} style={btn(primary, "#fff", { fontSize: 12 })}>
                {wait > 0 ? `Próximo em ${wait}s` : seq.i + 1 < seq.ids.length ? "Próximo →" : "Concluir"}</button>
              <button type="button" onClick={() => setSeq(null)} style={btn("transparent", C.dim, { border: `1px solid ${C.border}`, fontSize: 12 })}>Encerrar</button>
            </span>
          </div>
          {q.sentTodayMine >= goal && (
            <p style={{ fontSize: 12, color: "#FCD34D", margin: "0 0 10px" }}>⚠ Você já bateu a meta de hoje ({goal}). Muitas mensagens novas no mesmo dia aumentam o risco de bloqueio do número.</p>
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

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        {(["all", 1, 2, 3, 4] as Stage[]).map((st) => {
          const n = st === "all" ? counts[1].ready + counts[2].ready + counts[3].ready : onlyReady && st !== 4 ? counts[st].ready : counts[st].all;
          return (
            <button key={st} type="button" onClick={() => { setStage(st); setSel(new Set()); }}
              style={btn(stage === st ? "#16A34A" : C.panel2, stage === st ? "#fff" : C.dim, { border: `1px solid ${C.border}`, fontSize: 12 })}>
              {st === "all" ? "Todas as etapas" : STAGE_LABEL[st]} ({n})
            </button>
          );
        })}
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: C.body, cursor: "pointer", marginLeft: 6 }}>
          <input type="checkbox" checked={onlyReady} onChange={(e) => setOnlyReady(e.target.checked)} /> Só os do dia
        </label>
      </div>

      {stage !== 4 && selectable.length > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: C.body, cursor: "pointer" }}>
            <input type="checkbox" checked={allSel}
              onChange={() => setSel(allSel ? new Set() : new Set(selectable.slice(0, SEQ_MAX).map((l) => l.id!)))} />
            Selecionar todos{selectable.length > SEQ_MAX ? ` (até ${SEQ_MAX} por rodada)` : ""}
          </label>
          <button type="button" disabled={!sel.size || !!seq} onClick={startSeq} style={btn(sel.size ? "#16A34A" : C.border, sel.size ? "#fff" : C.dim, { fontSize: 12 })}>
            ▶ Enviar em sequência ({sel.size})
          </button>
          <span style={{ fontSize: 11.5, color: C.dim }}>Sem disparo automático: você confirma cada mensagem, com 45–90 s entre uma e outra.</span>
        </div>
      )}

      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px", lineHeight: 1.6 }}>
        Envie pelo seu WhatsApp e personalize quando puder. Disparo em massa faz o WhatsApp bloquear o número. Quem pedir para parar: marque <em>Sem interesse</em>.
      </p>

      {visible.length ? visible.map(row) : (
        <p style={{ color: C.dim, fontSize: 13 }}>
          {stage === 1 || stage === "all" ? "Nada para hoje nesta etapa. Faça uma busca no Radar ou desmarque “Só os do dia” para ver os agendados." : "Nada nesta etapa."}
        </p>
      )}
    </div>
  );
}
