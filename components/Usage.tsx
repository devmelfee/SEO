"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { whatsappNumber } from "@/lib/site";
import type { Limits, Meter, Meters } from "@/lib/limits";
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
  if (!link) return <span style={{ fontSize: 11, color: C.dim }}>Para pedir mais, o administrador precisa cadastrar o WhatsApp em ⚙️ Configurações → Agência.</span>;
  return (
    <a href={link} target="_blank" rel="noreferrer" style={{ ...btn("#16A34A", "#fff", compact ? { fontSize: 11, padding: "5px 10px" } : {}), textDecoration: "none" }}>
      📲 Solicitar mais buscas
    </a>
  );
}

function MeterBar({ m, label: l, unit }: { m: Meter; label: string; unit: string }) {
  if (m.limit === null) return <span style={{ fontSize: 11.5, color: C.muted }}>{l}: <strong style={{ color: C.text }}>{m.used}</strong> {unit} · sem limite</span>;
  const pct = Math.min(100, (100 * m.used) / Math.max(1, m.limit));
  const color = pct >= 100 ? "#F87171" : pct >= 70 ? "#FBBF24" : "#10B981";
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 3, minWidth: 120 }}>
      <span style={{ fontSize: 11.5, color: C.muted }}>{l}: <strong style={{ color: pct >= 100 ? "#F87171" : C.text }}>{m.used}/{m.limit}</strong> {unit}</span>
      <span style={{ height: 4, background: C.panel2, borderRadius: 2 }} role="img" aria-label={`${m.used} de ${m.limit}`}>
        <span style={{ display: "block", width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
      </span>
      {m.resetAt && <span style={{ fontSize: 10.5, color: C.dim }}>libera {when(m.resetAt)}</span>}
    </span>
  );
}

/** Faixa de uso no topo do Radar: quanto já foi usado na janela e na semana. */
export function UsageBar({ u }: { u: MyUsage | null }) {
  if (!u) return null;
  const full = u.limited && [u.places.window, u.places.week, u.llm.window, u.llm.week].some((m) => m.limit !== null && m.used >= m.limit);
  return (
    <div className="dash-card" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", marginBottom: 14, padding: "10px 16px",
      borderColor: full ? "#7F1D1D" : undefined }}>
      <strong style={{ fontSize: 12 }}>{u.limited ? "Seu uso" : "Seu uso (administrador, sem limite)"}</strong>
      <MeterBar m={u.places.window} label={`🔎 Google · ${u.limits.window_hours}h`} unit="consultas" />
      <MeterBar m={u.places.week} label="🔎 Google · semana" unit="consultas" />
      <MeterBar m={u.llm.window} label={`✦ IA · ${u.limits.window_hours}h`} unit="gerações" />
      <MeterBar m={u.llm.week} label="✦ IA · semana" unit="gerações" />
      {u.limited && <span style={{ marginLeft: "auto" }}><RequestMore u={u} compact /></span>}
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
    <div role="alert" style={{ maxWidth: 1120, margin: "16px auto 0", padding: "12px 16px", background: "#1C0A0A", border: "1px solid #7F1D1D",
      borderRadius: 10, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, color: "#FCA5A5", flex: 1, minWidth: 220 }}>⛔ {msg}</span>
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
  byAction: Record<string, { count: number; units: number; usd: number }>; recent: Ev[] };

const ACTION: Record<string, string> = {
  radar: "🔎 Busca no Radar", onde_prospectar: "🧭 Onde prospectar", concorrentes: "📊 Concorrentes (fase 1)",
  texto_ia: "✦ Texto com IA", site_ia: "🌐 Site com IA",
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
    <Shell title="📊 Controle de gastos" subtitle="Consultas ao Google Places e gerações de IA, por pessoa" onClose={onClose} width={1040}>
      {err && <p style={{ color: C.red, fontSize: 13 }}>⚠ {err}</p>}
      {flash && <p role="status" style={{ color: "#6EE7B7", fontSize: 13 }}>✓ {flash}</p>}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        {[[1, "Hoje (24h)"], [7, "7 dias"], [30, "30 dias"], [90, "90 dias"]].map(([d, l]) => (
          <button key={d} type="button" onClick={() => setDays(d as number)}
            style={btn(days === d ? "#7C3AED" : C.panel2, days === d ? "#fff" : C.dim, { border: `1px solid ${C.border}`, fontSize: 12 })}>{l}</button>
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
                  {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" style={{ ...btn("#16A34A", "#fff", { fontSize: 12 }), textDecoration: "none" }}>📲 WhatsApp</a>}
                  {p.role !== "removido" && <>
                    <button type="button" onClick={() => setEditing(editing === p.email ? null : p.email)} style={btn(C.panel2, C.blue, { border: `1px solid ${C.border}`, fontSize: 12 })}>Limites</button>
                    <button type="button" title="Zera a contagem da janela e da semana"
                      onClick={async () => { try { await patch({ email: p.email, reset: true }); ok(`Contagem de ${p.email} zerada.`); } catch (e) { setErr((e as Error).message); } }}
                      style={btn(C.panel2, "#6EE7B7", { border: `1px solid ${C.border}`, fontSize: 12 })}>Liberar agora</button>
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

        <details className="dash-card" style={{ margin: "16px 0" }}>
          <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 14 }}>⚙️ Limite padrão da equipe (vale para quem não tem limite próprio)</summary>
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
