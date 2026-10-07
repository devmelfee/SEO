"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PHASES, missingFields, phaseNeedsRealData, type FormData, type Phase } from "@/lib/phases";
import { api, type Section, type Status } from "@/lib/api";
import { PromptCard } from "./PromptCard";
import { RealDataPanel } from "./RealDataPanel";
import { UrlField, VerticalPicker } from "./Fields";
import { ClientsModal, ReportModal, SettingsModal, type Agency } from "./Modals";
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
  const [modal, setModal] = useState<null | "settings" | "report" | "clients">(null);
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
      setFormData(d.formData ?? {}); setResults(d.results ?? {}); setCompleted(d.completed ?? []);
      setClientId(d.clientId ?? null); setActivePhase(d.activePhase ?? 0);
    }
    setHydrated(true);
    api<Status>("/api/status").then(async (s) => {
      setStatus(s);
      if (!s.supabase) return;
      const st = await api<Agency>("/api/settings").catch(() => ({}) as Agency);
      setSettings(st);
      if (!d) setFormData((p) => applyDefaults(p, st));
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

  // Mudanças na Configuração Inicial e nas fases concluídas vão para o banco (antes só a criação era salva).
  useEffect(() => {
    if (!hydrated || !clientId || !supabaseOn) return;
    const t = setTimeout(() => {
      api(`/api/clients/${clientId}`, { method: "PATCH", body: payload() })
        .then(() => flashDb("✓ salvo", C.green))
        .catch((e) => flashDb(`⚠ ${e.message}`, "#F87171", true));
    }, 1200);
    return () => clearTimeout(t);
  }, [formData, completed, clientId, supabaseOn, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSection = async (label: string, content: string, fromAi: boolean) => {
    const id = await ensureClient();
    if (!id) return; // sem banco: fica no rascunho local
    flashDb("💾 salvando…", "#FBBF24", true);
    try {
      await api(`/api/clients/${id}/phases`, { method: "PUT", body: { label, content, fromAi } });
      flashDb("✓ salvo", C.green);
    } catch (e) { flashDb(`⚠ ${(e as Error).message}`, "#F87171", true); throw e; }
  };

  const onGenerated = async (label: string, text: string) => {
    setResults((p) => ({ ...p, [label]: { content: text, original: text } }));
    await saveSection(label, text, true);
  };
  const onEdited = async (label: string, text: string) => {
    setResults((p) => ({ ...p, [label]: { content: text, original: p[label]?.original ?? text } }));
    await saveSection(label, text, false);
  };

  const updateField = (k: keyof FormData, v: string) => setFormData((p) => ({ ...p, [k]: v }));

  const markDone = async (idx: number) => {
    if (idx === 0) {
      const miss = missingFields(formData);
      if (miss.length) { flashDb("⚠ Preencha nome, nicho e cidade", "#F87171"); return; }
    }
    setCompleted((p) => (p.includes(idx) ? p : [...p, idx].sort()));
    if (idx === 0) await ensureClient().catch((e) => flashDb(`⚠ ${e.message}`, "#F87171", true));
    if (idx < PHASES.length - 1) setActivePhase(idx + 1);
  };

  const reset = () => {
    setFormData(applyDefaults({}, settings)); setResults({}); setCompleted([]); setClientId(null);
    setActivePhase(0); setSession((s) => s + 1);
  };

  const openClient = async (id: string) => {
    try {
      const { client, phases } = await api<{ client: any; phases: { phase_label: string; content: string; original_content: string }[] }>(`/api/clients/${id}`);
      setFormData({ clientName: client.name, clientUrl: client.url, vertical: client.vertical, city: client.city,
        pricing: client.pricing, goal: client.goal, realData: client.real_data });
      setResults(Object.fromEntries(phases.map((p) => [p.phase_label, { content: p.content, original: p.original_content || p.content }])));
      setCompleted(Array.isArray(client.completed_phases) ? client.completed_phases : []);
      setClientId(client.id); setActivePhase(0); setSession((s) => s + 1); setModal(null);
    } catch (e) { flashDb(`⚠ ${(e as Error).message}`, "#F87171", true); }
  };

  const saveSettings = async (s: Agency) => {
    if (!supabaseOn) throw new Error("Configure o Supabase para salvar as configurações.");
    setSettings(await api<Agency>("/api/settings", { method: "PUT", body: s }));
  };

  const phase = PHASES[activePhase];
  const progress = Math.round((completed.length / PHASES.length) * 100);
  const resultCount = Object.values(results).filter((r) => r.content.trim()).length;
  const clientLabel = formData.clientName || formData.vertical;
  const missingSetup = status && (!status.anthropic || !status.supabase);

  if (!hydrated) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      {modal === "settings" && <SettingsModal settings={settings} status={status} onSave={saveSettings} onClose={() => setModal(null)} />}
      {modal === "report" && <ReportModal results={results} formData={formData} agency={settings} onClose={() => setModal(null)} onReset={reset} />}
      {modal === "clients" && <ClientsModal currentId={clientId} onOpen={openClient} onClose={() => setModal(null)} />}

      <header className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 18 }}>📍</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{settings.name || "SEO Local Agency"}</div>
            <div style={{ color: C.faint, fontSize: 12 }}>{settings.consultant ? `${settings.consultant} · ` : ""}Sistema de execução com IA</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {dbMsg && <span role="status" style={{ fontSize: 11, color: dbMsg.c, fontWeight: 600 }}>{dbMsg.t}</span>}
          {clientLabel && (
            <span style={{ background: C.panel2, border: `1px solid ${C.borderBlue}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: C.blue,
              fontWeight: 700, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              title={clientId ? "Salvo no Supabase" : "Ainda não salvo no banco"}>
              {clientId ? "💾 " : ""}{clientLabel}{formData.city ? ` · ${formData.city}` : ""}
            </span>
          )}
          <button type="button" onClick={() => setModal("clients")} disabled={!supabaseOn} title={supabaseOn ? "" : "Configure o Supabase"}
            style={btn(C.panel2, supabaseOn ? C.blue : C.faint, { border: `1px solid ${C.border}` })}>👥 Clientes</button>
          <button type="button" onClick={() => setModal("report")}
            style={btn(resultCount ? primary : C.panel2, resultCount ? "#fff" : C.faint, { border: resultCount ? "none" : `1px solid ${C.border}` })}>
            📋 Relatório{resultCount ? ` (${resultCount})` : ""}
          </button>
          <button type="button" aria-label="Configurações" onClick={() => setModal("settings")} style={btn(C.panel2, C.blue, { border: `1px solid ${C.border}`, fontSize: 14 })}>⚙️</button>
          <button type="button" aria-label="Novo cliente" title="Novo cliente"
            onClick={() => (resultCount || clientLabel) && !confirm("Começar um cliente novo? O atual continua salvo em Clientes.") ? null : reset()}
            style={btn(C.panel2, C.dim, { border: `1px solid ${C.border}`, fontSize: 13 })}>🔄</button>
          <button type="button" aria-label="Sair" title="Sair" onClick={() => api("/api/logout", { method: "POST" }).finally(() => (window.location.href = "/login"))}
            style={btn(C.panel2, C.dim, { border: `1px solid ${C.border}`, fontSize: 13 })}>⎋</button>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: C.faint }}>Progresso</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.green }}>{progress}%</div>
          </div>
        </div>
      </header>
      <div style={{ height: 2, background: "#0D1F35" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#0D9488,#7C3AED)", transition: "width .5s" }} />
      </div>

      {missingSetup && (
        <div style={{ maxWidth: 1120, margin: "16px auto 0", padding: "0 16px" }}>
          <button type="button" onClick={() => setModal("settings")} style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "#1C1000",
            border: "1px solid #B4530960", borderRadius: 10, padding: "12px 16px", color: "#FCD34D", fontSize: 13 }}>
            ⚠ Faltam credenciais: {[!status.anthropic && "IA (ANTHROPIC_API_KEY)", !status.supabase && "banco (Supabase)"].filter(Boolean).join(" e ")}.
            {" "}Clique para ver o que configurar na Vercel.
          </button>
        </div>
      )}

      <div className="layout">
        <aside className="sidebar">
          <p style={{ ...label, color: C.faint, fontSize: 10 }}>Fases</p>
          {PHASES.map((p, i) => {
            const active = i === activePhase, done = completed.includes(i);
            return (
              <button key={p.id} type="button" onClick={() => setActivePhase(i)} className="phase-btn"
                style={{ background: active ? C.panel2 : "transparent", border: `1px solid ${active ? p.color + "55" : "transparent"}` }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
                  background: done ? "#052E16" : active ? p.color + "18" : C.panel, border: `2px solid ${done ? C.green : active ? p.color : C.border}` }}>
                  {done ? <span style={{ color: C.green, fontWeight: 700, fontSize: 11 }}>✓</span> : p.emoji}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: active ? C.text : done ? C.green : C.dim }}>{p.title}</span>
              </button>
            );
          })}
        </aside>

        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: C.panel, border: `1px solid ${phase.color}25`, borderLeft: `4px solid ${phase.color}`, borderRadius: 12, padding: "18px 22px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 26 }}>{phase.emoji}</span>
              <div style={{ flex: 1 }}>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{phase.title}</h1>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: C.dim }}>{phase.subtitle}</p>
              </div>
              <span style={{ fontSize: 11, color: phase.color, fontWeight: 700 }}>{activePhase + 1}/{PHASES.length}</span>
            </div>
          </div>

          {phase.steps ? (
            <SetupForm phase={phase} formData={formData} onUpdate={updateField} />
          ) : (
            <div key={`${session}-${phase.id}`}>
              {phaseNeedsRealData(phase) && (
                <RealDataPanel formData={formData} onChange={(v) => updateField("realData", v)} placesEnabled={!!status?.places} clientId={clientId} />
              )}
              {phase.parts!.map((part) => (
                <PromptCard key={part.label} part={part} formData={formData} color={phase.color} saved={results[part.label]}
                  onGenerated={onGenerated} onEdited={onEdited} />
              ))}
              {phase.tips && (
                <div style={{ background: C.panel, border: `1px solid ${C.borderBlue}`, borderRadius: 10, padding: 16 }}>
                  <p style={{ ...label, color: "#3B82F6" }}>Por que isso importa</p>
                  {phase.tips.map((t, i) => (
                    <p key={i} style={{ color: C.dim, fontSize: 13, margin: "0 0 6px", lineHeight: 1.6 }}>{t.replace(/\{clientName\}/g, formData.clientName || "o cliente")}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
            {activePhase > 0 && (
              <button type="button" onClick={() => setActivePhase(activePhase - 1)}
                style={btn("transparent", C.muted, { border: `1px solid ${C.border}`, padding: "11px 18px", fontSize: 13 })}>← Voltar</button>
            )}
            <button type="button" onClick={() => markDone(activePhase)}
              style={btn(`linear-gradient(135deg,${phase.color},${phase.color}BB)`, "#fff", { padding: "11px 26px", fontSize: 13, flex: activePhase === 0 ? 1 : undefined })}>
              {activePhase === PHASES.length - 1 ? "✓ Concluir processo" : "Marcar fase concluída →"}
            </button>
            {activePhase === PHASES.length - 1 && resultCount > 0 && (
              <button type="button" onClick={() => setModal("report")} style={btn(primary, "#fff", { padding: "11px 22px", fontSize: 13 })}>📋 Ver relatório →</button>
            )}
          </div>

          {completed.length === PHASES.length && (
            <div style={{ marginTop: 22, background: "#052E16", border: "1px solid #166534", borderRadius: 12, padding: 24, textAlign: "center" }}>
              <p style={{ fontSize: 30, margin: "0 0 10px" }}>🚀</p>
              <h3 style={{ color: "#6EE7B7", margin: "0 0 8px" }}>Processo concluído!</h3>
              <p style={{ color: "#4ADE80", margin: "0 0 20px", fontSize: 13 }}>
                {clientLabel} · {formData.city} · {resultCount} seções{clientId ? " · 💾 salvo no Supabase" : ""}
              </p>
              <button type="button" onClick={() => setModal("report")} style={btn(primary, "#fff", { padding: "12px 24px", fontSize: 14 })}>📋 Gerar Relatório Final</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function applyDefaults(p: FormData, s: Agency): FormData {
  return { ...p, vertical: p.vertical || s.default_vertical || "", city: p.city || s.default_city || "", pricing: p.pricing || s.default_pricing || "" };
}

function SetupForm({ phase, formData, onUpdate }: { phase: Phase; formData: FormData; onUpdate: (k: keyof FormData, v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {phase.steps!.map((step) => {
        const v = (formData[step.id] as string) ?? "";
        return (
          <div key={step.id}>
            <label style={label}>{step.label}{step.required && <span style={{ color: "#DC2626", marginLeft: 4 }}>*</span>}</label>
            {step.type === "vertical" ? <VerticalPicker value={v} options={step.options!} onChange={(x) => onUpdate(step.id, x)} />
              : step.type === "url" ? <UrlField value={v} onChange={(x) => onUpdate(step.id, x)} />
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
