"use client";
import { useEffect, useState } from "react";
import { api, copyText } from "@/lib/api";
import { buildMessage, isDue, MAX_STEP, waLink, type OutreachCtx } from "@/lib/outreach";
import { C, btn, input, primary } from "./styles";
import type { Prospect } from "./Radar";

export type Sender = { name?: string; consultant?: string };
type Event = { step: number; channel: string; kind: string; message: string; created_by: string; created_at: string };

const STEP_LABEL: Record<number, string> = { 1: "1º contato", 2: "Lembrete (2º dia)", 3: "Último lembrete (5º dia)" };
const fmt = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Escrever e enviar pelo WhatsApp (1 a 1), registrar o contato e marcar resposta. */
export function OutreachComposer({ lead, sender, leaderReviews, onUpdated }: {
  lead: Prospect & { contact_step?: number | null; next_followup_at?: string | null };
  sender: Sender; leaderReviews?: number;
  onUpdated: (p: Partial<Prospect>) => void;
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
          <button type="button" onClick={send} disabled={done && step <= (lead.contact_step ?? 0)} style={btn("#16A34A", "#fff")}>📲 Abrir WhatsApp e registrar</button>
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

type Queue = { due: Prospect[]; fresh: Prospect[]; sentToday: number; leaders: Record<string, number> };
const GOAL_KEY = "seo_daily_goal";

/** Fila do dia: lembretes vencidos primeiro, depois os melhores leads novos com celular. */
export function OutreachQueue({ projectId, sender, onUpdated }: { projectId: string; sender: Sender; onUpdated: () => void }) {
  const [q, setQ] = useState<Queue | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [goal, setGoal] = useState(() => { try { return Number(localStorage.getItem(GOAL_KEY)) || 20; } catch { return 20; } });
  const [err, setErr] = useState("");

  const load = () => api<Queue>(`/api/outreach${projectId ? `?project=${projectId}` : ""}`).then(setQ).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { localStorage.setItem(GOAL_KEY, String(goal)); } catch { /* sem armazenamento */ } }, [goal]);

  if (err) return <p style={{ color: C.red, fontSize: 13 }}>⚠ {err}</p>;
  if (!q) return <p style={{ color: C.dim, fontSize: 13 }}>Carregando a fila…</p>;
  const pct = Math.min(100, Math.round((100 * q.sentToday) / Math.max(1, goal)));

  const row = (p: Prospect, tag: string) => (
    <div key={p.place_id} className="dash-card" style={{ marginBottom: 8, padding: 0 }}>
      <div className="prospect-row" style={{ cursor: "pointer" }} onClick={() => setOpen(open === p.place_id ? null : p.place_id)}>
        <strong style={{ width: 38, textAlign: "center", color: "#A78BFA" }}>{p.score}</strong>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: 14 }}>{p.name}</strong>
          <div style={{ fontSize: 12, color: C.muted }}>{tag} · {p.query} · {p.issues.slice(0, 2).map((i) => i.label).join(", ") || "—"}</div>
        </div>
        <span style={{ color: C.dim, fontSize: 12 }}>{open === p.place_id ? "▲" : "▼"}</span>
      </div>
      {open === p.place_id && (
        <div style={{ padding: "0 16px 16px" }}>
          <OutreachComposer lead={p} sender={sender} leaderReviews={q.leaders[p.query]}
            onUpdated={() => { onUpdated(); setTimeout(load, 300); }} />
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="kpis" style={{ marginBottom: 16 }}>
        <div className="kpi">
          <div style={{ fontSize: 11, color: C.muted }}>Mensagens enviadas hoje (equipe)</div>
          <div style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 6px" }}>{q.sentToday} <span style={{ fontSize: 13, color: C.muted, fontWeight: 400 }}>/ meta {goal}</span></div>
          <div style={{ height: 6, background: C.panel2, borderRadius: 3 }}><div style={{ width: `${pct}%`, height: "100%", background: "#16A34A", borderRadius: 3 }} /></div>
          <label style={{ fontSize: 11, color: C.dim, display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>Meta diária
            <input type="number" min={1} max={200} value={goal} onChange={(e) => setGoal(Number(e.target.value) || 1)} style={{ ...input, width: 70, padding: "3px 6px", fontSize: 12 }} />
          </label>
        </div>
        <div className="kpi"><div style={{ fontSize: 11, color: C.muted }}>Lembretes vencidos</div>
          <div style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 2px", color: q.due.length ? "#F87171" : C.text }}>{q.due.length}</div>
          <div style={{ fontSize: 11, color: C.dim }}>fazer primeiro</div></div>
        <div className="kpi"><div style={{ fontSize: 11, color: C.muted }}>Novos com WhatsApp</div>
          <div style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 2px" }}>{q.fresh.length}</div>
          <div style={{ fontSize: 11, color: C.dim }}>ordenados pela nota</div></div>
      </div>

      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px", lineHeight: 1.6 }}>
        Envie uma a uma, pelo seu WhatsApp, e personalize quando puder. Disparo em massa faz o WhatsApp bloquear o número.
        Quem pedir para parar: marque <em>Sem interesse</em>.
      </p>

      {q.due.length > 0 && <h3 className="dash-title" style={{ margin: "8px 0" }}>⏰ Lembretes vencidos</h3>}
      {q.due.map((p) => row(p, "lembrete"))}
      <h3 className="dash-title" style={{ margin: "16px 0 8px" }}>🎯 Próximos para abordar</h3>
      {q.fresh.length ? q.fresh.map((p) => row(p, "novo")) : (
        <p style={{ color: C.dim, fontSize: 13 }}>Nenhum lead novo com celular. Faça uma busca no Radar ou em 🧭 Onde prospectar.</p>
      )}
    </div>
  );
}
