"use client";
import { ThemeToggle } from "./ThemeToggle";
import { useCallback, useEffect, useRef, useState } from "react";
import { PHASES, missingFields, phaseNeedsRealData, type FormData, type Phase } from "@/lib/phases";
import { api, type Section, type Status } from "@/lib/api";
import { whatsappNumber } from "@/lib/site";
import { PromptCard } from "./PromptCard";
import { RealDataPanel } from "./RealDataPanel";
import { UrlField, VerticalPicker } from "./Fields";
import { Radar, type Prospect } from "./Radar";
import { DiagnosisSend, ProposalPanel, WhatsAppButton } from "./Proposal";
import { OutreachQueue } from "./Outreach";
import { ClientsModal, ReportModal, SettingsModal, type Agency } from "./Modals";
import { LimitBanner, UsageModal, useMyUsage } from "./Usage";
import { C, btn, input, label, primary } from "./styles";

const DRAFT_KEY = "seo_draft_v2";
type Draft = { formData: FormData; results: Record<string, Section>; completed: number[]; clientId: string | null; activePhase: number };

function readDraft(): Draft | null {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null"); } catch { return null; }
}

export default function SeoApp() {
  const [activePhase, setActivePhase] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [formData, setFormData] = useState<FormData>({});
  const [results, setResults] = useState<Record<string, Section>>({});
  const [clientId, setClientId] = useState<string | null>(null);
  // Muda a cada "novo cliente"/"abrir cliente": remonta os cartões (antes mostravam o texto do cliente anterior).
  const [session, setSession] = useState(0);
  const [settings, setSettings] = useState<Agency>({});
  const [status, setStatus] = useState<Status | null>(null);
  const [modal, setModal] = useState<null | "settings" | "report" | "clients" | "usage">(null);
  const [usage] = useMyUsage();
  const [view, setView] = useState<View>(() => {
    try { const v = localStorage.getItem("seo_view"); return v === "exec" || v === "abordagem" ? v : "radar"; } catch { return "radar"; }
  });
  useEffect(() => { try { localStorage.setItem("seo_view", view); } catch { /* sem armazenamento */ } }, [view]);
  const [more, setMore] = useState(false);
  const [dbMsg, setDbMsg] = useState<{ t: string; c: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const clientIdRef = useRef<string | null>(null);
  clientIdRef.current = clientId;
  const creating = useRef<Promise<string | null> | null>(null);
  const formRef = useRef(formData);
  formRef.current = formData;
  const completedRef = useRef(completed);
  completedRef.current = completed;
  const dbTimer = useRef<ReturnType<typeof setTimeout>>();
  // Só grava o cliente quando alguém EDITOU algo nesta tela. Carregar rascunho ou abrir cliente não grava
  // (antes, um rascunho velho no navegador sobrescrevia o que estava no banco).
  const dirty = useRef(false);

  const supabaseOn = !!status?.supabase;

  const flashDb = (t: string, c: string, keep = false) => {
    setDbMsg({ t, c });
    clearTimeout(dbTimer.current);
    if (!keep) dbTimer.current = setTimeout(() => setDbMsg(null), 2500);
  };

  // ── carga inicial: status das conexões, configurações e rascunho local ──
  useEffect(() => {
    const d = readDraft();
    if (d) {
      setFormData(d.formData ?? {}); setResults(d.results ?? {}); setCompleted(validSteps(d.completed));
      setClientId(d.clientId ?? null); setActivePhase(Math.min(d.activePhase ?? 0, PHASES.length - 1));
    }
    setHydrated(true);
    api<Status>("/api/status").then(async (s) => {
      setStatus(s);
      if (!s.supabase) return;
      const st = await api<Agency>("/api/settings").catch(() => ({}) as Agency);
      setSettings(st);
      // O banco é a fonte da verdade: se o rascunho aponta para um cliente salvo, recarrega dele.
      if (d?.clientId) await openClient(d.clientId, { keepPhase: Math.min(d.activePhase ?? 0, PHASES.length - 1) });
      else if (!d) setFormData((p) => applyDefaults(p, st));
    }).catch(() => setStatus(null));
  }, []);

  // Rascunho local: recarregar a página não perde o trabalho, mesmo sem Supabase.
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, results, completed, clientId, activePhase } satisfies Draft)); } catch {}
  }, [hydrated, formData, results, completed, clientId, activePhase]);

  const payload = () => ({ ...formRef.current, completedPhases: completedRef.current });

  /** Cria o cliente no banco uma única vez, mesmo com várias gerações em paralelo (antes duplicava). */
  const ensureClient = useCallback(async (): Promise<string | null> => {
    if (clientIdRef.current) return clientIdRef.current;
    if (!supabaseOn || missingFields(formRef.current).length) return null;
    creating.current ??= api<{ id: string }>("/api/clients", { body: payload() })
      .then((r) => { clientIdRef.current = r.id; setClientId(r.id); return r.id; })
      .finally(() => { creating.current = null; });
    return creating.current;
  }, [supabaseOn]);

  // Mudanças nos dados do cliente e nas etapas concluídas vão para o banco (antes só a criação era salva).
  useEffect(() => {
    if (!hydrated || !clientId || !supabaseOn || !dirty.current) return;
    const t = setTimeout(() => {
      dirty.current = false;
      api(`/api/clients/${clientId}`, { method: "PATCH", body: payload() })
        .then(() => flashDb("✓ salvo", C.green))
        .catch((e) => flashDb(`⚠ ${e.message}`, C.red, true));
    }, 1200);
    return () => clearTimeout(t);
  }, [formData, completed, clientId, supabaseOn, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSection = async (label: string, content: string, fromAi: boolean) => {
    const id = await ensureClient();
    if (!id) return; // sem banco: fica no rascunho local
    flashDb("salvando…", C.amber, true);
    try {
      await api(`/api/clients/${id}/phases`, { method: "PUT", body: { label, content, fromAi } });
      flashDb("✓ salvo", C.green);
    } catch (e) { flashDb(`⚠ ${(e as Error).message}`, C.red, true); throw e; }
  };

  const onGenerated = async (label: string, text: string) => {
    setResults((p) => ({ ...p, [label]: { content: text, original: text } }));
    await saveSection(label, text, true);
  };
  const onEdited = async (label: string, text: string) => {
    setResults((p) => ({ ...p, [label]: { content: text, original: p[label]?.original ?? text } }));
    await saveSection(label, text, false);
  };

  const updateField = (k: keyof FormData, v: string) => { dirty.current = true; setFormData((p) => ({ ...p, [k]: v })); };

  const markDone = async (idx: number) => {
    if (idx === 0) {
      const miss = missingFields(formData);
      if (miss.length) { flashDb("⚠ Preencha nome, nicho e cidade", C.red); return; }
    }
    dirty.current = true;
    setCompleted((p) => (p.includes(idx) ? p : [...p, idx].sort()));
    if (idx === 0) await ensureClient().catch((e) => flashDb(`⚠ ${e.message}`, C.red, true));
    if (idx < PHASES.length - 1) setActivePhase(idx + 1);
  };

  const reset = () => {
    setFormData(applyDefaults({}, settings)); setResults({}); setCompleted([]); setClientId(null);
    setActivePhase(0); setSession((s) => s + 1);
  };

  const openClient = async (id: string, opts: { keepPhase?: number } = {}) => {
    dirty.current = false;
    try {
      const { client, phases } = await api<{ client: any; phases: { phase_label: string; content: string; original_content: string }[] }>(`/api/clients/${id}`);
      setFormData({ clientName: client.name, clientUrl: client.url, phone: client.phone ?? "", vertical: client.vertical, city: client.city,
        pricing: client.pricing, goal: client.goal, realData: client.real_data });
      setResults(Object.fromEntries(phases.map((p) => [p.phase_label, { content: p.content, original: p.original_content || p.content }])));
      setCompleted(validSteps(client.completed_phases));
      setClientId(client.id); setActivePhase(opts.keepPhase ?? 0); setSession((s) => s + 1); setModal(null);
    } catch (e) {
      // Cliente apagado no banco: descarta o rascunho órfão em vez de recriar com dados velhos.
      if (/não encontrado/i.test((e as Error).message)) { setClientId(null); setResults({}); }
      flashDb(`⚠ ${(e as Error).message}`, C.red, true); }
  };

  /** Lead do Radar → cliente em execução, já com nicho, cidade, site e os concorrentes reais da busca. */
  const startFromProspect = async (p: Prospect, competitors: string, vertical: string, city: string) => {
    setView("exec");
    if (p.client_id) { await openClient(p.client_id); return; }
    const data: FormData = { ...applyDefaults({}, settings), clientName: p.name, clientUrl: p.website, phone: p.phone, vertical: vertical || settings.default_vertical || "", city: city || settings.default_city || "", realData: competitors };
    setFormData(data); setResults({}); setCompleted([0]); setClientId(null); setActivePhase(1); setSession((s) => s + 1);
    if (!supabaseOn) return;
    try {
      const c = await api<{ id: string }>("/api/clients", { body: { ...data, completedPhases: [0] } });
      clientIdRef.current = c.id; setClientId(c.id);
      if (p.id) await api(`/api/prospects/${p.id}`, { method: "PATCH", body: { client_id: c.id } });
      flashDb("✓ lead virou cliente", C.green);
    } catch (e) { flashDb(`⚠ ${(e as Error).message}`, C.red, true); }
  };

  const logout = () => { api("/api/logout", { method: "POST" }).finally(() => (window.location.href = "/login")); };

  const saveSettings = async (s: Agency) => {
    if (!supabaseOn) throw new Error("Configure o Supabase para salvar as configurações.");
    setSettings(await api<Agency>("/api/settings", { method: "PUT", body: s }));
  };

  const phase = PHASES[activePhase];
  // Preços vêm de Configurações → Comercial e entram nos prompts como {investimento}.
  const promptData: FormData = { ...formData, monthlyPrice: settings.monthly_price, trialPrice: settings.trial_price };
  const resultCount = Object.values(results).filter((r) => r.content.trim()).length;
  const clientLabel = formData.clientName || formData.vertical;
  // A IA é opcional (há o modo "colar resultado"); o banco não.
  const missingSetup = status && !status.supabase;

  if (!hydrated) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      {modal === "settings" && <SettingsModal settings={settings} status={status} onSave={saveSettings} onClose={() => setModal(null)} />}
      {modal === "report" && <ReportModal results={results} formData={formData} agency={settings} onClose={() => setModal(null)} onReset={reset} />}
      {modal === "usage" && <UsageModal onClose={() => setModal(null)} />}
      {modal === "clients" && <ClientsModal currentId={clientId} onOpen={openClient} onClose={() => setModal(null)} />}

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>{(settings.name || "S").trim().charAt(0).toUpperCase()}</span>
          <span className="brand-name">{settings.name || "SEO Local"}</span>
          {dbMsg && <span role="status" style={{ fontSize: 12, color: dbMsg.c, fontWeight: 600, whiteSpace: "nowrap" }}>{dbMsg.t}</span>}
        </div>
        <nav className="nav" aria-label="Seções">
          {NAV.map(([v, ico, l]) => (
            <button key={v} type="button" className="nav-btn" aria-current={view === v ? "page" : undefined} onClick={() => setView(v)}>
              <span aria-hidden>{ico}</span>{l}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          {usage?.role === "admin" && <button type="button" className="icon-btn desk-only" onClick={() => setModal("usage")}>Gastos</button>}
          <ThemeToggle />
          <button type="button" className="icon-btn" aria-label="Configurações" title="Configurações" onClick={() => setModal("settings")}>Ajustes</button>
          <button type="button" className="icon-btn desk-only" title="Sair" onClick={logout}>Sair</button>
        </div>
      </header>

      <nav className="bottom-nav" aria-label="Seções">
        {NAV.map(([v, ico, l]) => (
          <button key={v} type="button" aria-current={view === v && !more ? "page" : undefined} onClick={() => { setMore(false); setView(v); }}>
            <span className="ico" aria-hidden>{ico}</span>{l}
          </button>
        ))}
        <button type="button" aria-current={more ? "page" : undefined} aria-expanded={more} onClick={() => setMore(!more)}>
          <span className="ico" aria-hidden>☰</span>Mais
        </button>
      </nav>
      {more && (
        <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "#0F172A55" }} onClick={() => setMore(false)}>
          <div className="card" role="menu" onClick={(e) => e.stopPropagation()}
            style={{ position: "absolute", left: 8, right: 8, bottom: "calc(72px + env(safe-area-inset-bottom))", padding: 6 }}>
            {([
              ...(usage?.role === "admin" ? [["Gastos e limites", () => setModal("usage")]] : []),
              ["Configurações", () => setModal("settings")],
              ["Sair", logout],
            ] as [string, () => void][]).map(([l, fn]) => (
              <button key={l} type="button" role="menuitem" onClick={() => { setMore(false); fn(); }}
                style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: 0, padding: "14px 12px", fontSize: 15, color: C.text, borderRadius: 8, cursor: "pointer" }}>{l}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: "0 16px" }}><LimitBanner u={usage} /></div>

      {missingSetup && (
        <div style={{ maxWidth: 1120, margin: "16px auto 0", padding: "0 16px" }}>
          <button type="button" onClick={() => setModal("settings")} style={{ width: "100%", textAlign: "left", cursor: "pointer", background: C.amberWash,
            border: "1px solid var(--amber-line)", borderRadius: 10, padding: "12px 16px", color: C.amber, fontSize: 13 }}>
            ⚠ Banco desligado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY): nada está sendo salvo.
            {" "}Clique para ver o que configurar na Vercel.
          </button>
        </div>
      )}

      {/* O Radar fica montado (só escondido) para não perder busca, filtros e análise ao trocar de aba. */}
      <div className="layout-single" hidden={view !== "radar"}>
        <Radar placesEnabled={!!status?.places} supabaseOn={supabaseOn} aiEnabled={!!status?.anthropic} sender={{ name: settings.name, consultant: settings.consultant }} usage={usage} onCreateClient={startFromProspect} />
      </div>
      {view === "abordagem" && (
        <div className="layout-single">
          <h1 className="page-title">Abordagem</h1>
          <p className="page-sub">Quem chamar hoje no WhatsApp, um por vez.</p>
          <OutreachQueue projectId="" sender={{ name: settings.name, consultant: settings.consultant }} onUpdated={() => {}} />
        </div>
      )}
      {view === "exec" && (
      <div className="layout">
        <aside className="sidebar">
          <div className="dash-card" style={{ padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: C.muted }}>Cliente</div>
            <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formData.clientName || "Novo cliente"}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button type="button" onClick={() => setModal("clients")} disabled={!supabaseOn} style={btn(C.panel2, C.text, { flex: 1, padding: "6px 8px", minHeight: 32 })}>Trocar</button>
              <button type="button" onClick={() => (resultCount || clientLabel) && !confirm("Começar um cliente novo? O atual continua salvo.") ? null : reset()}
                style={btn(C.panel2, C.text, { flex: 1, padding: "6px 8px", minHeight: 32 })}>+ Novo</button>
            </div>
          </div>
          <div className="steps" role="tablist" aria-label="Etapas">
          {PHASES.map((p, i) => {
            const active = i === activePhase, done = completed.includes(i);
            return (
              <button key={p.id} type="button" role="tab" aria-selected={active} onClick={() => setActivePhase(i)} className="phase-btn"
                style={{ background: active ? C.tealWash : "transparent", border: `1px solid ${active ? C.tealLine : "transparent"}` }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                  background: done ? C.green : active ? C.teal : C.panel2, color: done || active ? C.onAccent : C.muted }}>
                  {done ? "✓" : i + 1}
                </span>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: active ? C.text : C.body }}>{p.title}</span>
                  <span className="phase-sub" style={{ fontSize: 11.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{STEP_HINT[i]}</span>
                </span>
              </button>
            );
          })}
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-title">{activePhase + 1}. {phase.title}</h1>
          <p className="page-sub">{phase.subtitle}</p>

          {formData.clientName && activePhase > 0 && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: C.muted, flex: 1, minWidth: 0 }}>{[formData.vertical, formData.city, formData.phone || "sem WhatsApp"].filter(Boolean).join(" · ")}</span>
              <WhatsAppButton phone={formData.phone} text={`Olá! ${settings.consultant ? `Aqui é ${settings.consultant}. ` : ""}`} label="WhatsApp" />
            </div>
          )}

          <div key={`${session}-${phase.id}`}>
            {phase.steps && <SetupForm phase={phase} formData={formData} onUpdate={updateField} />}
            {phaseNeedsRealData(phase) && (
              <div style={{ marginTop: phase.steps ? 24 : 0 }}>
                <RealDataPanel formData={formData} onChange={(v) => updateField("realData", v)} placesEnabled={!!status?.places} clientId={clientId} />
              </div>
            )}
            {phase.id === 2 && <DiagnosisSend clientId={clientId} phone={formData.phone} sender={settings.consultant} />}
            {phase.id === 3 && <ProposalPanel clientId={clientId} phone={formData.phone} aiEnabled={!!status?.anthropic} />}
            {phase.id === 4 && (
              <p style={{ fontSize: 13, color: C.muted, margin: "0 0 14px" }}>
                ✓ {phase.parts!.filter((x) => results[x.label]?.content.trim()).length} de {phase.parts!.length} entregas prontas.
                {" "}Gere o que for usar agora — cada geração conta no seu limite de IA.
              </p>
            )}
            {phase.parts?.map((part, i) => (
              <div key={part.label}>
                {part.group && part.group !== phase.parts![i - 1]?.group && <h3 className="dash-title" style={{ margin: "18px 0 10px" }}>{part.group}</h3>}
                <PromptCard part={part} formData={promptData} color={phase.color} saved={results[part.label]} aiEnabled={!!status?.anthropic}
                  onGenerated={onGenerated} onEdited={onEdited} />
              </div>
            ))}
            {phase.tips && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer", fontSize: 13, color: C.muted }}>Dicas desta etapa</summary>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: C.body, fontSize: 13, lineHeight: 1.7 }}>
                  {phase.tips.map((t, i) => <li key={i}>{t.replace(/^\S+\s/, "").replace(/\{clientName\}/g, formData.clientName || "o cliente")}</li>)}
                </ul>
              </details>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
            {activePhase > 0 && (
              <button type="button" onClick={() => setActivePhase(activePhase - 1)}
                style={btn("transparent", C.muted, { border: `1px solid ${C.border}`, padding: "11px 18px", fontSize: 13 })}>← Voltar</button>
            )}
            <button type="button" onClick={() => markDone(activePhase)}
              style={btn(primary, C.onAccent, { padding: "11px 26px", fontSize: 14, flex: 1 })}>
              {activePhase === PHASES.length - 1 ? "Concluir entrega" : "Concluir etapa →"}
            </button>
            {resultCount > 0 && (
              <button type="button" onClick={() => setModal("report")} style={btn("transparent", C.body, { border: `1px solid ${C.border}`, padding: "11px 18px" })}>Relatório ({resultCount})</button>
            )}
          </div>

          {completed.length === PHASES.length && (
            <div style={{ marginTop: 22, background: C.greenWash, border: "1px solid var(--green-line)", borderRadius: 12, padding: 24, textAlign: "center" }}>
              <h3 style={{ color: C.green, margin: "0 0 8px" }}>Cliente concluído</h3>
              <p style={{ color: C.green, margin: "0 0 20px", fontSize: 13 }}>
                {clientLabel} · {formData.city} · {resultCount} seções{clientId ? " · salvo" : ""}
              </p>
              <button type="button" onClick={() => setModal("report")} style={btn(primary, C.onAccent, { padding: "12px 24px", fontSize: 14 })}>Ver relatório final</button>
            </div>
          )}
        </main>
      </div>
      )}
    </div>
  );
}

const STEP_HINT = ["dados e concorrentes", "o que está faltando", "site + proposta", "trabalho no Google"];
/** Clientes antigos tinham 7 fases: ignora índices que não existem mais. */
const validSteps = (v: unknown): number[] => (Array.isArray(v) ? v.filter((n) => Number.isInteger(n) && n >= 0 && n < PHASES.length) : []);

type View = "radar" | "abordagem" | "exec";
const NAV: [View, string, string][] = [["radar", "⌕", "Buscar"], ["abordagem", "✉", "Abordagem"], ["exec", "▤", "Clientes"]];

function applyDefaults(p: FormData, s: Agency): FormData {
  return { ...p, vertical: p.vertical || s.default_vertical || "", city: p.city || s.default_city || "" };
}

function SetupForm({ phase, formData, onUpdate }: { phase: Phase; formData: FormData; onUpdate: (k: keyof FormData, v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {phase.steps!.map((step) => {
        const v = (formData[step.id] as string) ?? "";
        return (
          <div key={step.id}>
            <label style={label}>{step.label}{step.required && <span style={{ color: C.red, marginLeft: 4 }}>*</span>}</label>
            {step.type === "vertical" ? <VerticalPicker value={v} options={step.options!} onChange={(x) => onUpdate(step.id, x)} />
              : step.type === "url" ? <UrlField value={v} onChange={(x) => onUpdate(step.id, x)} />
              : step.type === "tel" ? (
                <>
                  <input type="tel" inputMode="tel" value={v} placeholder={step.placeholder} onChange={(e) => onUpdate(step.id, e.target.value)} style={input} />
                  {v.trim() && !whatsappNumber(v) && <p style={{ fontSize: 12, color: C.amber, margin: "6px 0 0" }}>Não parece um celular (DDD + 9 dígitos). Fixo não abre no WhatsApp.</p>}
                </>
              )
              : step.type === "select" ? (
                <select value={v} onChange={(e) => onUpdate(step.id, e.target.value)} style={{ ...input, color: v ? C.text : C.dim, cursor: "pointer" }}>
                  <option value="">Selecione…</option>
                  {step.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : <input type="text" value={v} placeholder={step.placeholder} onChange={(e) => onUpdate(step.id, e.target.value)} style={input} />}
          </div>
        );
      })}
    </div>
  );
}
