"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { whatsappNumber } from "@/lib/site";
import { AI_MODELS, llmCostUsd, TYPICAL_TOKENS, type Limits, type Meter, type Meters } from "@/lib/limits";
import { Shell } from "./Modals";
import { C, btn, input, label, primary } from "./styles";

export type MyUsage = {
  email: string; role: "admin" | "member"; limited: boolean; limits: Limits;
  places: Meters; llm: Meters; adminWhatsapp: string; phone: string;
};

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const usd = (v: number) => `US$ ${v.toFixed(v < 1 ? 3 : 2)}`;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Uso da pessoa logada; recarrega sozinho quando uma busca ou geração termina. */
export function useMyUsage(): [MyUsage | null, () => void] {
  const [u, setU] = useState<MyUsage | null>(null);
  const load = useCallback(() => { api<MyUsage>("/api/usage/me").then(setU).catch(() => {}); }, []);
  useEffect(() => {
    load();
    let t: ReturnType<typeof setTimeout>;
    const on = () => { clearTimeout(t); t = setTimeout(load, 500); };
    window.addEventListener("usage-changed", on);
    return () => { window.removeEventListener("usage-changed", on); clearTimeout(t); };
  }, [load]);
  return [u, load];
}

/** Link do WhatsApp do administrador com o pedido pronto. */
export function requestLink(u: MyUsage | null, what = "consultas"): string | null {
  const n = u && whatsappNumber(u.adminWhatsapp);
  if (!n || !u) return null;
  const text = `Olá! Aqui é ${u.email}${u.phone ? ` (${u.phone})` : ""}. Atingi o limite de ${what} no SEO Local Agency. Pode liberar mais para mim?`;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export function RequestMore({ u, what, compact }: { u: MyUsage | null; what?: string; compact?: boolean }) {
  const link = requestLink(u, what);
  if (!link) return <span style={{ fontSize: 11, color: C.dim }}>Para pedir mais, o administrador precisa cadastrar o WhatsApp em Configurações → Agência.</span>;
  return (
    <a href={link} target="_blank" rel="noreferrer" style={{ ...btn("#16A34A", "#fff", compact ? { fontSize: 11, padding: "5px 10px" } : {}), textDecoration: "none" }}>
      Pedir mais buscas
    </a>
  );
}

function MeterBar({ m, label: l, unit }: { m: Meter; label: string; unit: string }) {
  if (m.limit === null) return <span style={{ fontSize: 11.5, color: C.muted }}>{l}: <strong style={{ color: C.text }}>{m.used}</strong> {unit} · sem limite</span>;
  const pct = Math.min(100, (100 * m.used) / Math.max(1, m.limit));
  const color = pct >= 100 ? "#DC2626" : pct >= 70 ? "#D97706" : "#059669";
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 3, minWidth: 120 }}>
      <span style={{ fontSize: 11.5, color: C.muted }}>{l}: <strong style={{ color: pct >= 100 ? "#DC2626" : C.text }}>{m.used}/{m.limit}</strong> {unit}</span>
      <span style={{ height: 4, background: C.panel2, borderRadius: 2 }} role="img" aria-label={`${m.used} de ${m.limit}`}>
        <span style={{ display: "block", width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
      </span>
      {m.resetAt && <span style={{ fontSize: 10.5, color: C.dim }}>libera {when(m.resetAt)}</span>}
    </span>
  );
}

/** Uso da pessoa, discreto: só aparece para quem tem limite. Detalhes ao tocar. */
export function UsageBar({ u }: { u: MyUsage | null }) {
  const [open, setOpen] = useState(false);
  if (!u || !u.limited) return null;
  const frac = (m: Meter) => (m.limit ? m.used / m.limit : 0);
  const worst = Math.max(...[u.places.window, u.places.week, u.llm.window, u.llm.week].map(frac));
  const tone = worst >= 1 ? "#B91C1C" : worst >= 0.7 ? "#B45309" : C.muted;
  const left = (m: Meters) => {
    const vals = [m.window, m.week].filter((x) => x.limit !== null).map((x) => x.limit! - x.used);
    return vals.length ? Math.max(0, Math.min(...vals)) : "∞";
  };
  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        style={{ ...btn("#fff", tone, { border: `1px solid ${C.border}`, borderRadius: 999, fontSize: 12.5, minHeight: 34, padding: "6px 12px" }) }}>
        {left(u.places)} buscas · {left(u.llm)} IA restantes
      </button>
      {open && (
        <div className="card" style={{ position: "absolute", right: 0, top: 42, zIndex: 50, width: 290, padding: 14, display: "grid", gap: 10, boxShadow: "0 10px 30px #0F172A22" }}>
          <MeterBar m={u.places.window} label={`Buscas · ${u.limits.window_hours}h`} unit="" />
          <MeterBar m={u.places.week} label="Buscas · semana" unit="" />
          <MeterBar m={u.llm.window} label={`IA · ${u.limits.window_hours}h`} unit="" />
          <MeterBar m={u.llm.week} label="IA · semana" unit="" />
          <RequestMore u={u} compact />
        </div>
      )}
    </div>
  );
}

/** Aviso que aparece quando qualquer tela é barrada pelo limite. */
export function LimitBanner({ u }: { u: MyUsage | null }) {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const on = (e: Event) => setMsg(String((e as CustomEvent).detail ?? "Limite atingido."));
    window.addEventListener("usage-limit", on);
    return () => window.removeEventListener("usage-limit", on);
  }, []);
  if (!msg) return null;
  return (
    <div role="alert" style={{ maxWidth: 1120, margin: "16px auto 0", padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FECACA",
      borderRadius: 10, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, color: "#B91C1C", flex: 1, minWidth: 220 }}>⛔ {msg}</span>
      <RequestMore u={u} what={/IA/.test(msg) ? "gerações de IA" : "consultas ao Google"} />
      <button type="button" onClick={() => setMsg("")} style={btn("transparent", C.dim, { border: `1px solid ${C.border}` })}>Fechar</button>
    </div>
  );
}

// ─── Painel do administrador ────────────────────────────────────────────────

type Totals = { searches: number; ai: number; tokens: number; placesUsd: number; aiUsd: number };
type Person = {
  email: string; role: string; phone: string; override: Partial<Limits> | null; limits: Limits;
  places: Meters; llm: Meters; period: Totals;
};
type Ev = { user_email: string; kind: "places" | "llm"; action: string; query: string; units: number; model: string | null;
  input_tokens: number | null; output_tokens: number | null; cost_usd: number; created_at: string };
type Report = { days: number; usdBrl: number; defaults: Limits; totals: Totals; people: Person[];
  byAction: Record<string, { count: number; units: number; usd: number; input: number; output: number }>; recent: Ev[];
  placesUsd: number; models: { text: string; site: string } };

const ACTION: Record<string, string> = {
  radar: "Busca no Radar", onde_prospectar: "Onde prospectar", concorrentes: "Concorrentes (fase 1)",
  texto_ia: "Texto com IA", site_ia: "Site com IA",
};
const FIELDS: [keyof Limits, string][] = [
  ["window_hours", "Janela (horas)"], ["searches_window", "Consultas Google / janela"], ["searches_week", "Consultas Google / semana"],
  ["ai_window", "Gerações IA / janela"], ["ai_week", "Gerações IA / semana"],
];

function LimitsEditor({ value, onSave, onCancel, saveLabel = "Salvar" }: {
  value: Limits; onSave: (l: Limits) => Promise<void>; onCancel?: () => void; saveLabel?: string;
}) {
  const [f, setF] = useState<Record<keyof Limits, string>>(() =>
    Object.fromEntries(FIELDS.map(([k]) => [k, value[k] === null ? "" : String(value[k])])) as Record<keyof Limits, string>);
  const [err, setErr] = useState("");
  const save = async () => {
    setErr("");
    const out = Object.fromEntries(FIELDS.map(([k]) => [k, f[k].trim() === "" ? null : Math.max(0, Math.floor(Number(f[k])))])) as Limits;
    if (!out.window_hours) { setErr("A janela precisa ter pelo menos 1 hora."); return; }
    try { await onSave(out); } catch (e) { setErr((e as Error).message); }
  };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {FIELDS.map(([k, l]) => (
          <div key={k}><label style={label}>{l}</label>
            <input type="number" min={k === "window_hours" ? 1 : 0} value={f[k]} placeholder="sem limite"
              onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))} style={{ ...input, fontSize: 13 }} /></div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: C.dim, margin: "6px 0 10px" }}>Campo vazio = sem limite. 1 consulta = até 20 empresas do Google; "Onde prospectar" usa 1 por cidade.</p>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" onClick={save} style={btn(primary)}>{saveLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} style={btn(C.border, C.muted)}>Cancelar</button>}
        {err && <span style={{ color: C.red, fontSize: 12 }}>⚠ {err}</span>}
      </div>
    </div>
  );
}

export function UsageModal({ onClose }: { onClose: () => void }) {
  const [days, setDays] = useState(7);
  const [r, setR] = useState<Report | null>(null);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [flash, setFlash] = useState("");
  const [who, setWho] = useState("");

  const load = useCallback(() => { api<Report>(`/api/usage?days=${days}`).then(setR).catch((e) => setErr(e.message)); }, [days]);
  useEffect(() => { load(); }, [load]);
  const ok = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 2500); load(); };

  const patch = async (body: Record<string, unknown>) => { await api("/api/team", { method: "PATCH", body }); };
  const rate = r?.usdBrl ?? 5.5;
  const money = (v: number) => <>{usd(v)} <span style={{ color: C.dim, fontWeight: 400 }}>≈ {brl(v * rate)}</span></>;
  const recent = (r?.recent ?? []).filter((e) => !who || e.user_email === who);

  return (
    <Shell title="Controle de gastos" subtitle="Consultas ao Google Places e gerações de IA, por pessoa" onClose={onClose} width={1040}>
      {err && <p style={{ color: C.red, fontSize: 13 }}>⚠ {err}</p>}
      {flash && <p role="status" style={{ color: "#047857", fontSize: 13 }}>✓ {flash}</p>}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        {[[1, "Hoje (24h)"], [7, "7 dias"], [30, "30 dias"], [90, "90 dias"]].map(([d, l]) => (
          <button key={d} type="button" onClick={() => setDays(d as number)}
            style={btn(days === d ? "#0F766E" : C.panel2, days === d ? "#fff" : C.dim, { border: `1px solid ${C.border}`, fontSize: 12 })}>{l}</button>
        ))}
        <span style={{ fontSize: 11, color: C.dim, marginLeft: "auto" }}>Custos estimados pela tabela de preços (Google: US$ 0,035 por consulta; IA: por token).</span>
      </div>
      {!r ? <p style={{ color: C.dim }}>Carregando…</p> : (<>
        <div className="kpis" style={{ marginBottom: 16 }}>
          <div className="kpi"><div style={{ fontSize: 11, color: C.muted }}>Consultas ao Google</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{r.totals.searches}</div><div style={{ fontSize: 12 }}>{money(r.totals.placesUsd)}</div></div>
          <div className="kpi"><div style={{ fontSize: 11, color: C.muted }}>Gerações de IA</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{r.totals.ai}</div>
            <div style={{ fontSize: 12 }}>{money(r.totals.aiUsd)} · {r.totals.tokens.toLocaleString("pt-BR")} tokens</div></div>
          <div className="kpi"><div style={{ fontSize: 11, color: C.muted }}>Total no período</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{brl((r.totals.placesUsd + r.totals.aiUsd) * rate)}</div>
            <div style={{ fontSize: 12, color: C.dim }}>{usd(r.totals.placesUsd + r.totals.aiUsd)} · câmbio {rate.toFixed(2)}</div></div>
        </div>

        <h3 className="dash-title">Por pessoa</h3>
        <p className="dash-sub">Uso agora (janela e semana), gasto no período e limites. Administradores não são bloqueados.</p>
        {r.people.map((p) => {
          const wa = whatsappNumber(p.phone);
          return (
            <div key={p.email} className="dash-card" style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, wordBreak: "break-all" }}>{p.email}</div>
                  <div style={{ fontSize: 11.5, color: C.muted }}>
                    {p.role === "admin" ? "Administrador" : p.role === "member" ? "Membro" : "Fora da equipe"}
                    {" · "}{p.phone || "sem telefone"}{p.override ? " · limite próprio" : " · limite padrão"}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Período: <strong>{p.period.searches}</strong> consultas · <strong>{p.period.ai}</strong> IA · {money(p.period.placesUsd + p.period.aiUsd)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", flex: "2 1 420px" }}>
                  <MeterBar m={p.places.window} label={`Google ${p.limits.window_hours}h`} unit="" />
                  <MeterBar m={p.places.week} label="Google semana" unit="" />
                  <MeterBar m={p.llm.window} label={`IA ${p.limits.window_hours}h`} unit="" />
                  <MeterBar m={p.llm.week} label="IA semana" unit="" />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" style={{ ...btn("#16A34A", "#fff", { fontSize: 12 }), textDecoration: "none" }}>WhatsApp</a>}
                  {p.role !== "removido" && <>
                    <button type="button" onClick={() => setEditing(editing === p.email ? null : p.email)} style={btn(C.panel2, C.blue, { border: `1px solid ${C.border}`, fontSize: 12 })}>Limites</button>
                    <button type="button" title="Zera a contagem da janela e da semana"
                      onClick={async () => { try { await patch({ email: p.email, reset: true }); ok(`Contagem de ${p.email} zerada.`); } catch (e) { setErr((e as Error).message); } }}
                      style={btn(C.panel2, "#047857", { border: `1px solid ${C.border}`, fontSize: 12 })}>Liberar agora</button>
                  </>}
                  <button type="button" onClick={() => setWho(who === p.email ? "" : p.email)} style={btn(C.panel2, C.dim, { border: `1px solid ${C.border}`, fontSize: 12 })}>
                    {who === p.email ? "Ver todos" : "Buscas"}</button>
                </div>
              </div>
              {editing === p.email && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: "0 1 220px" }}><label style={label}>Telefone / WhatsApp</label>
                      <input defaultValue={p.phone} placeholder="(11) 9xxxx-xxxx" id={`ph-${p.email}`} style={{ ...input, fontSize: 13 }} /></div>
                    <button type="button" style={btn(C.border, C.text)} onClick={async () => {
                      const v = (document.getElementById(`ph-${p.email}`) as HTMLInputElement).value;
                      try { await patch({ email: p.email, phone: v }); ok("Telefone salvo."); } catch (e) { setErr((e as Error).message); }
                    }}>Salvar telefone</button>
                  </div>
                  <LimitsEditor value={p.limits} saveLabel="Salvar limite desta pessoa" onCancel={() => setEditing(null)}
                    onSave={async (l) => { await patch({ email: p.email, limits: l }); setEditing(null); ok("Limite salvo."); }} />
                  {p.override && (
                    <button type="button" onClick={async () => { await patch({ email: p.email, limits: null }); setEditing(null); ok("Voltou ao limite padrão."); }}
                      style={btn("transparent", C.dim, { border: `1px solid ${C.border}`, marginTop: 8, fontSize: 12 })}>Usar o limite padrão da equipe</button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <ModelsAndCosts r={r} rate={rate} onSaved={() => ok("Modelo salvo.")} onError={setErr} />

        <details className="dash-card" style={{ margin: "16px 0" }}>
          <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 14 }}>Limite padrão da equipe (vale para quem não tem limite próprio)</summary>
          <div style={{ marginTop: 12 }}>
            <LimitsEditor key={JSON.stringify(r.defaults)} value={r.defaults} saveLabel="Salvar padrão"
              onSave={async (l) => { await api("/api/usage", { method: "PUT", body: { default_limits: l, usd_brl: rate } }); ok("Padrão salvo."); }} />
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 12 }}>
              <div><label style={label}>Câmbio US$ → R$ (relatório)</label>
                <input id="usd-brl" type="number" step="0.01" defaultValue={rate} style={{ ...input, width: 120, fontSize: 13 }} /></div>
              <button type="button" style={btn(C.border, C.text)} onClick={async () => {
                const v = Number((document.getElementById("usd-brl") as HTMLInputElement).value);
                try { await api("/api/usage", { method: "PUT", body: { default_limits: r.defaults, usd_brl: v } }); ok("Câmbio salvo."); } catch (e) { setErr((e as Error).message); }
              }}>Salvar câmbio</button>
            </div>
          </div>
        </details>

        {Object.keys(r.byAction).length > 0 && (<>
          <h3 className="dash-title">Por tipo</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 16px" }}>
            {Object.entries(r.byAction).sort((a, b) => b[1].usd - a[1].usd).map(([a, v]) => (
              <span key={a} className="kpi" style={{ fontSize: 12 }}>{ACTION[a] ?? a}: <strong>{v.count}</strong>× · {usd(v.usd)}</span>
            ))}
          </div>
        </>)}

        <h3 className="dash-title">Últimas buscas e gerações{who ? ` — ${who}` : ""}</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ color: C.muted, textAlign: "left" }}>
              {["Quando", "Pessoa", "O quê", "Buscou", "Uso", "Custo"].map((h) => <th key={h} style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {recent.map((e, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{when(e.created_at)}</td>
                  <td style={{ padding: "6px 8px", wordBreak: "break-all" }}>{e.user_email || "—"}</td>
                  <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{ACTION[e.action] ?? e.action}</td>
                  <td style={{ padding: "6px 8px", color: C.body }}>{e.query || "—"}</td>
                  <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{e.kind === "places" ? `${e.units} consulta${e.units === 1 ? "" : "s"}` : `${((e.input_tokens ?? 0) + (e.output_tokens ?? 0)).toLocaleString("pt-BR")} tokens`}</td>
                  <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{usd(Number(e.cost_usd))}</td>
                </tr>
              ))}
              {!recent.length && <tr><td colSpan={6} style={{ padding: 16, color: C.dim, textAlign: "center" }}>Nada no período.</td></tr>}
            </tbody>
          </table>
        </div>
      </>)}
    </Shell>
  );
}

// ─── Modelo de IA e comparativo de custos ────────────────────────────────────

/** Tokens médios por geração: a média real do período quando existe, senão o típico. */
function avgTokens(r: Report, action: "texto_ia" | "site_ia") {
  const a = r.byAction[action];
  return a && a.count && a.input + a.output > 0 ? { input: a.input / a.count, output: a.output / a.count, real: true } : { ...TYPICAL_TOKENS[action], real: false };
}

function ModelsAndCosts({ r, rate, onSaved, onError }: { r: Report; rate: number; onSaved: () => void; onError: (m: string) => void }) {
  const [models, setModels] = useState(r.models);
  const reais = (usdV: number) => brl(usdV * rate);
  const text = avgTokens(r, "texto_ia"), site = avgTokens(r, "site_ia");
  const choose = async (use: "text" | "site", id: string) => {
    setModels((m) => ({ ...m, [use]: id }));
    try { await api("/api/usage", { method: "PUT", body: use === "text" ? { ai_model_text: id } : { ai_model_site: id } }); onSaved(); }
    catch (e) { onError((e as Error).message); }
  };

  // Mesmo uso de IA do período, re-precificado em cada modelo. Sem uso: 100 textos + 10 sites como exemplo.
  const t = r.byAction.texto_ia, s = r.byAction.site_ia;
  const hasUse = !!((t?.input ?? 0) + (t?.output ?? 0) + (s?.input ?? 0) + (s?.output ?? 0));
  const scenario = hasUse
    ? [{ i: t?.input ?? 0, o: t?.output ?? 0, use: "text" as const }, { i: s?.input ?? 0, o: s?.output ?? 0, use: "site" as const }]
    : [{ i: text.input * 100, o: text.output * 100, use: "text" as const }, { i: site.input * 10, o: site.output * 10, use: "site" as const }];
  const bars = AI_MODELS.map((m) => ({ m, usd: scenario.reduce((acc, x) => acc + llmCostUsd(m.id, x.i, x.o), 0) }));
  const current = scenario.reduce((acc, x) => acc + llmCostUsd(models[x.use], x.i, x.o), 0);
  const max = Math.max(...bars.map((b) => b.usd), current, 1e-9);
  const searchUsd = r.placesUsd;

  const cell = (usdV: number, on: boolean) => (
    <td style={{ padding: "7px 8px", textAlign: "right", whiteSpace: "nowrap", fontWeight: on ? 800 : 400, color: on ? C.text : C.body,
      background: on ? "#CCFBF1" : undefined }}>{reais(usdV)}</td>
  );

  return (
    <div className="dash-card" style={{ margin: "16px 0" }}>
      <h3 className="dash-title">Modelo de IA e comparativo de custos</h3>
      <p className="dash-sub">Escolha o modelo para cada uso. A troca vale para a próxima geração de toda a equipe.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 16 }}>
        {(["text", "site"] as const).map((use) => (
          <div key={use}><label style={label} htmlFor={`model-${use}`}>{use === "text" ? "Textos (diagnóstico e entrega)" : "Sites de prévia com IA"}</label>
            <select id={`model-${use}`} value={models[use]} onChange={(e) => choose(use, e.target.value)} style={{ ...input, fontSize: 13, cursor: "pointer" }}>
              {AI_MODELS.map((m) => {
                const tk = use === "text" ? text : site;
                return <option key={m.id} value={m.id}>{m.tier} — {reais(llmCostUsd(m.id, tk.input, tk.output))} por {use === "text" ? "texto" : "site"} · {m.note}</option>;
              })}
              {!AI_MODELS.some((m) => m.id === models[use]) && <option value={models[use]}>{models[use]} (definido na Vercel)</option>}
            </select></div>
        ))}
      </div>

      <div style={{ overflowX: "auto", marginBottom: 18 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <caption style={{ textAlign: "left", fontSize: 12, color: C.muted, marginBottom: 6 }}>Custo estimado por ação (destacado = modelo em uso)</caption>
          <thead><tr style={{ color: C.muted }}>
            <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>Ação</th>
            {AI_MODELS.map((m) => <th key={m.id} style={{ textAlign: "right", padding: "6px 8px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{m.tier}</th>)}
          </tr></thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}><td style={{ padding: "7px 8px" }}>Busca no Google (20 empresas)</td>
              {AI_MODELS.map((m) => <td key={m.id} style={{ padding: "7px 8px", textAlign: "right", color: C.body }}>{reais(searchUsd)}</td>)}</tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}><td style={{ padding: "7px 8px" }}>Texto com IA {text.real ? <span style={{ color: C.dim }}>(média real)</span> : ""}</td>
              {AI_MODELS.map((m) => <Fragment key={m.id}>{cell(llmCostUsd(m.id, text.input, text.output), m.id === models.text)}</Fragment>)}</tr>
            <tr><td style={{ padding: "7px 8px" }}>Site com IA {site.real ? <span style={{ color: C.dim }}>(média real)</span> : ""}</td>
              {AI_MODELS.map((m) => <Fragment key={m.id}>{cell(llmCostUsd(m.id, site.input, site.output), m.id === models.site)}</Fragment>)}</tr>
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12.5, fontWeight: 700, margin: "0 0 4px" }}>
        {hasUse ? `Gasto de IA destes ${r.days === 1 ? "último dia" : `${r.days} dias`} em cada modelo` : "Exemplo: 100 textos + 10 sites em cada modelo"}
      </p>
      <p style={{ fontSize: 11.5, color: C.dim, margin: "0 0 10px" }}>Mesmo uso, preço de cada modelo. O Google custa igual em todos ({reais(r.totals.placesUsd)} no período).</p>
      <div role="img" aria-label={bars.map((b) => `${b.m.tier}: ${reais(b.usd)}`).join(", ")}>
        {[...bars, { m: { id: "atual", tier: "Sua escolha atual", note: "", effort: "low" as const }, usd: current }].map((b) => (
          <div key={b.m.id} title={`${b.m.tier}: ${reais(b.usd)} (${usd(b.usd)})`} style={{ display: "grid", gridTemplateColumns: "130px 1fr 90px", gap: 10, alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: b.m.id === "atual" ? C.text : C.body, fontWeight: b.m.id === "atual" ? 800 : 400 }}>{b.m.tier}</span>
            <span style={{ height: 14, background: C.panel2, borderRadius: 4 }}>
              <span style={{ display: "block", height: "100%", width: `${Math.max(1, (100 * b.usd) / max)}%`, borderRadius: "0 4px 4px 0",
                background: b.m.id === "atual" ? "#0F766E" : "#115E59" }} />
            </span>
            <span style={{ fontSize: 12, textAlign: "right", fontWeight: b.m.id === "atual" ? 800 : 400 }}>{reais(b.usd)}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: C.dim, margin: "8px 0 0" }}>
        Estimativa pela tabela de preços da Anthropic (US$ por milhão de tokens) e pelos tokens {text.real || site.real ? "médios reais" : "típicos"} de cada ação.
        Modelos diferentes gastam quantidades um pouco diferentes de tokens; o valor exato de cada geração está em "Últimas buscas".
      </p>
    </div>
  );
}
