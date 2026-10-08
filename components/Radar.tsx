"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { STATUSES, type Issue, type ProspectStatus } from "@/lib/opportunity";
import { VERTICALS } from "@/lib/phases";
import { HOT, REGION_PRESETS } from "@/lib/market";
import { RegionDashboard, type RegionResult } from "./RegionDashboard";
import { ProjectsPanel, type Project } from "./ProjectsPanel";
import { SiteBuilder } from "./SiteBuilder";
import { OutreachComposer, OutreachQueue, type Sender } from "./Outreach";
import { isDue } from "@/lib/outreach";
import { UsageBar, type MyUsage } from "./Usage";
import { C, btn, input, label, primary } from "./styles";

export type Prospect = {
  id?: string; place_id: string; query: string; name: string; address: string; phone: string; website: string;
  maps_url: string; rating: number | null; reviews_count: number; primary_type: string; has_hours: boolean;
  photos_count: number; rank_in_search: number; score: number; issues: Issue[]; status?: ProspectStatus; notes?: string;
  client_id?: string | null; project_id?: string | null;
  contact_step?: number | null; last_contact_at?: string | null; next_followup_at?: string | null;
};

type Mode = "cidade" | "regiao" | "projetos" | "abordagem";
const UI_KEY = "seo_radar_ui_v1";
type UiState = { mode: Mode; vertical: string; city: string; max: 20 | 40 | 60; citiesText: string; activeQuery: string; projectFilter: string; batchId: string };
function readUi(): Partial<UiState> { try { return JSON.parse(localStorage.getItem(UI_KEY) ?? "{}"); } catch { return {}; } }

const STATUS_LABEL: Record<ProspectStatus, string> = {
  novo: "Novo", abordado: "Abordado", respondeu: "Respondeu", proposta: "Proposta enviada", fechado: "Fechado", descartado: "Descartado",
};
const STATUS_COLOR: Record<ProspectStatus, string> = {
  novo: C.blue, abordado: "#FBBF24", respondeu: "#F472B6", proposta: "#A78BFA", fechado: C.green, descartado: C.dim,
};

export function scoreColor(s: number) {
  return s >= 60 ? "#F87171" : s >= 35 ? "#FBBF24" : C.green;
}

/** Texto com os concorrentes da mesma busca, para o {realData} do cliente que nascer deste lead. */
export function competitorsText(all: Prospect[], self: Prospect): string {
  return [...all].filter((p) => p.place_id !== self.place_id).sort((a, b) => a.rank_in_search - b.rank_in_search).slice(0, 5)
    .map((p, i) => `${i + 1}. ${p.name} — posição ${p.rank_in_search} na busca — ${p.reviews_count} avaliações, nota ${p.rating ?? "sem nota"}${p.website ? ` — site: ${p.website}` : " — sem site"}${p.address ? ` — ${p.address}` : ""}`)
    .join("\n") +
    `\n\nO PRÓPRIO CLIENTE (${self.name}): posição ${self.rank_in_search}, ${self.reviews_count} avaliações, nota ${self.rating ?? "sem nota"}, ` +
    `${self.website ? `site ${self.website}` : "SEM SITE"}. Problemas detectados: ${self.issues.map((i) => i.label).join(", ") || "nenhum"}.`;
}

export function Radar({ placesEnabled, supabaseOn, aiEnabled, sender, usage, onCreateClient }: {
  placesEnabled: boolean; supabaseOn: boolean; aiEnabled: boolean; sender: Sender; usage: MyUsage | null;
  onCreateClient: (p: Prospect, competitors: string, vertical: string, city: string) => void;
}) {
  // Estado da tela guardado no navegador: trocar de aba ou recarregar não perde a busca nem os filtros.
  const [ui0] = useState(readUi);
  const [mode, setMode] = useState<Mode>(ui0.mode ?? "cidade");
  const [vertical, setVertical] = useState(ui0.vertical ?? "");
  const [citiesText, setCitiesText] = useState(ui0.citiesText ?? "");
  const [regionBusy, setRegionBusy] = useState(false);
  const [region, setRegion] = useState<RegionResult | null>(null);
  const [batches, setBatches] = useState<{ batchId: string; niche: string; createdAt: string; cities: string[] }[]>([]);
  const [city, setCity] = useState(ui0.city ?? "");
  const [max, setMax] = useState<20 | 40 | 60>(ui0.max ?? 20);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState<Prospect[]>([]);
  const [queries, setQueries] = useState<string[]>([]);
  const [activeQuery, setActiveQuery] = useState(ui0.activeQuery ?? "");
  const [projectFilter, setProjectFilter] = useState(ui0.projectFilter ?? "");
  const [projects, setProjects] = useState<Project[]>([]);
  const [onlyNoSite, setOnlyNoSite] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | ProspectStatus>("");
  const [open, setOpen] = useState<string | null>(null);
  const [siteFor, setSiteFor] = useState<string | null>(null);
  const [waFor, setWaFor] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify({ mode, vertical, city, max, citiesText, activeQuery, projectFilter, batchId: region?.batchId ?? "" } satisfies UiState));
    } catch { /* navegador sem armazenamento: segue sem lembrar */ }
  }, [mode, vertical, city, max, citiesText, activeQuery, projectFilter, region?.batchId]);

  const loadProjects = () => api<Project[]>("/api/projects").then(setProjects).catch(() => {});
  const loadBatches = () => api<{ batches: typeof batches }>("/api/radar/region").then((r) => setBatches(r.batches)).catch(() => {});
  const openBatch = async (id: string) => {
    if (!id) { setRegion(null); return; }
    try { setRegion(await api<RegionResult>(`/api/radar/region?batch=${id}`)); } catch (e) { setErr((e as Error).message); }
  };

  const load = async (query = activeQuery, project = projectFilter) => {
    if (!supabaseOn) return;
    try {
      const qs = new URLSearchParams();
      if (project) qs.set("project", project); else if (query) qs.set("query", query);
      const r = await api<{ prospects: Prospect[]; queries: string[] }>(`/api/prospects${qs.size ? `?${qs}` : ""}`);
      setRows(r.prospects); setQueries(r.queries);
    } catch (e) { setErr((e as Error).message); }
  };
  useEffect(() => {
    if (!supabaseOn) return;
    load(); loadProjects(); loadBatches();
    if (ui0.batchId) openBatch(ui0.batchId);
  }, [supabaseOn]); // eslint-disable-line react-hooks/exhaustive-deps

  const cityList = [...new Set(citiesText.split(/[,\n;]/).map((c) => c.trim()).filter((c) => c.length > 1))].slice(0, 12);
  const canRegion = placesEnabled && vertical.trim().length > 1 && cityList.length > 0 && !regionBusy;

  const regionSearch = async () => {
    setRegionBusy(true); setErr(""); setRegion(null);
    try {
      const r = await api<RegionResult>("/api/radar/region", { body: { niche: vertical.trim(), cities: cityList } });
      setRegion(r); loadBatches();
      setQueries((q) => [...new Set([...r.results.map((x) => x.query), ...q])]);
    } catch (e) { setErr((e as Error).message); }
    setRegionBusy(false);
  };

  const openQuery = (query: string) => { setMode("cidade"); setProjectFilter(""); setActiveQuery(query); load(query, ""); };
  const openProject = (p: Project) => { setMode("cidade"); setProjectFilter(p.id); setActiveQuery(""); load("", p.id); };

  const createProject = async (name: string, niche: string) => {
    const p = await api<Project>("/api/projects", { body: { name, niche } });
    await loadProjects();
    return p;
  };
  const addToProject = async (projectId: string, qs: string[], filter: "all" | "hot" | "no_site") => {
    const r = await api<{ added: number }>(`/api/projects/${projectId}/leads`, { body: { queries: qs, filter } });
    await loadProjects();
    return r.added;
  };
  const deleteProject = async (p: Project) => {
    await api(`/api/projects/${p.id}`, { method: "DELETE" });
    if (projectFilter === p.id) setProjectFilter("");
    await loadProjects();
  };

  const search = async () => {
    const query = `${vertical.trim()} em ${city.trim()}`;
    setBusy(true); setErr("");
    try {
      const r = await api<{ prospects: Prospect[] }>("/api/radar", { body: { query, max } });
      setRows(r.prospects); setActiveQuery(query); setProjectFilter("");
      if (!queries.includes(query)) setQueries((q) => [query, ...q]);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  const update = async (p: Prospect, patch: Partial<Prospect>) => {
    setRows((rs) => rs.map((r) => (r.place_id === p.place_id ? { ...r, ...patch } : r)));
    if (!p.id) return;
    try { await api(`/api/prospects/${p.id}`, { method: "PATCH", body: patch }); }
    catch (e) { setErr((e as Error).message); load(); }
  };

  const visible = useMemo(() => rows
    .filter((r) => !onlyNoSite || !r.website || r.issues.some((i) => i.code === "social_only"))
    .filter((r) => !statusFilter || (r.status ?? "novo") === statusFilter),
  [rows, onlyNoSite, statusFilter]);

  const noSite = rows.filter((r) => !r.website || r.issues.some((i) => i.code === "social_only")).length;
  const hot = rows.filter((r) => r.score >= HOT).length;
  const canSearch = placesEnabled && vertical.trim().length > 1 && city.trim().length > 1 && !busy;

  return (
    <div>
      <UsageBar u={usage} />
      <div style={{ background: C.panel, border: `1px solid #7C3AED40`, borderLeft: "4px solid #7C3AED", borderRadius: 12, padding: "18px 22px", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>📡 Radar de oportunidades</h1>
        <p style={{ margin: "4px 0 16px", fontSize: 13, color: C.dim }}>
          Busca empresas no Google Maps, aponta o que está faltando em cada uma e ordena da melhor oportunidade para a pior.
        </p>
        <div role="tablist" style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {([["cidade", "🔎 Buscar numa cidade"], ["regiao", "🧭 Onde prospectar"], ["projetos", `📁 Projetos${projects.length ? ` (${projects.length})` : ""}`], ["abordagem", "📲 Abordagem"]] as const).map(([m, l]) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
              style={btn(mode === m ? "#7C3AED" : C.panel2, mode === m ? "#fff" : C.dim, { border: `1px solid ${mode === m ? "#7C3AED" : C.border}` })}>{l}</button>
          ))}
        </div>
        {(mode === "cidade" || mode === "regiao") && (<>
        <div className="radar-form">
          <div style={{ flex: 2 }}><label style={label} htmlFor="radar-niche">Nicho (digite qualquer um)</label>
            <input id="radar-niche" list="radar-verticals" value={vertical} onChange={(e) => setVertical(e.target.value)}
              placeholder="Ex: Loja de roupa infantil, Pet shop, Dentistas…" style={input} />
            <datalist id="radar-verticals">{VERTICALS.map((v) => <option key={v} value={v} />)}</datalist>
          </div>
          {mode === "cidade" ? (
            <>
              <div style={{ flex: 2 }}><label style={label}>Cidade ou bairro</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Jundiaí ou Vila Arens, Jundiaí" style={input}
                  onKeyDown={(e) => e.key === "Enter" && canSearch && search()} />
              </div>
              <div style={{ flex: 1 }}><label style={label}>Quantos</label>
                <select value={max} onChange={(e) => setMax(Number(e.target.value) as 20 | 40 | 60)} style={{ ...input, cursor: "pointer" }}>
                  <option value={20}>20</option><option value={40}>40</option><option value={60}>60</option>
                </select>
              </div>
              <button type="button" onClick={search} disabled={!canSearch}
                style={btn(canSearch ? "linear-gradient(135deg,#7C3AED,#6D28D9)" : C.border, canSearch ? "#fff" : C.dim, { padding: "12px 22px", fontSize: 13, alignSelf: "flex-end" })}>
                {busy ? "⟳ Buscando…" : "🔎 Buscar"}
              </button>
            </>
          ) : (
            <div style={{ flex: 4, minWidth: 260 }}><label style={label} htmlFor="radar-cities">Cidades ou bairros (separe por vírgula, até 12)</label>
              <textarea id="radar-cities" value={citiesText} onChange={(e) => setCitiesText(e.target.value)} rows={2}
                placeholder="Ex: Jundiaí, Várzea Paulista, Itupeva" style={{ ...input, resize: "vertical", fontSize: 13 }} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {Object.entries(REGION_PRESETS).map(([name, list]) => (
                  <button key={name} type="button" onClick={() => setCitiesText(list.join(", "))}
                    style={btn(C.panel2, C.blue, { fontSize: 11, padding: "4px 10px", border: `1px solid ${C.border}` })}>+ {name}</button>
                ))}
              </div>
            </div>
          )}
        </div>
        {mode === "regiao" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={regionSearch} disabled={!canRegion}
              style={btn(canRegion ? "linear-gradient(135deg,#7C3AED,#6D28D9)" : C.border, canRegion ? "#fff" : C.dim, { padding: "12px 22px", fontSize: 13 })}>
              {regionBusy ? `⟳ Analisando ${cityList.length} cidades…` : `🧭 Comparar ${cityList.length || ""} cidades`}
            </button>
            <span style={{ fontSize: 12, color: C.muted }}>Busca 20 empresas por cidade ({cityList.length * 20} no total) e salva todas como leads.</span>
          </div>
        )}
        </>)}
        {!placesEnabled && <p style={{ color: "#FCD34D", fontSize: 12, margin: "12px 0 0" }}>⚠ Busca desligada: falta GOOGLE_PLACES_API_KEY (e o faturamento ativo no Google Cloud).</p>}
        {!supabaseOn && <p style={{ color: "#FCD34D", fontSize: 12, margin: "8px 0 0" }}>⚠ Supabase desligado: os leads não serão salvos.</p>}
        {err && <p role="alert" style={{ color: C.red, fontSize: 13, margin: "12px 0 0" }}>⚠ {err}</p>}
      </div>

      {mode === "regiao" && batches.length > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.muted }}>Análises salvas:</span>
          <select aria-label="Análises salvas" value={region?.batchId ?? ""} onChange={(e) => openBatch(e.target.value)}
            style={{ ...input, width: "auto", fontSize: 12, padding: "7px 10px", cursor: "pointer" }}>
            <option value="">— escolher —</option>
            {batches.map((b) => (
              <option key={b.batchId} value={b.batchId}>{b.niche} · {b.cities.length} cidades · {new Date(b.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: C.dim }}>Reabrir não gasta buscas no Google.</span>
        </div>
      )}

      {mode === "regiao" && region && (
        <RegionDashboard key={region.batchId ?? region.niche} region={region} projects={projects}
          onOpenQuery={openQuery} onAddToProject={addToProject} onCreateProject={createProject} />
      )}

      {mode === "projetos" && (
        <ProjectsPanel projects={projects} onOpen={openProject} onCreate={createProject} onDelete={deleteProject} />
      )}

      {mode === "abordagem" && (
        <div>
          {projects.length > 0 && (
            <select aria-label="Projeto da fila" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
              style={{ ...input, width: "auto", fontSize: 12, padding: "7px 10px", cursor: "pointer", marginBottom: 12 }}>
              <option value="">Todos os projetos</option>
              {projects.map((p) => <option key={p.id} value={p.id}>📁 {p.name}</option>)}
            </select>
          )}
          <OutreachQueue key={projectFilter} projectId={projectFilter} sender={sender} onUpdated={() => { load(); loadProjects(); }} />
        </div>
      )}

      {mode === "cidade" && (rows.length > 0 || queries.length > 0 || !!projectFilter) && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
          {projects.length > 0 && (
            <select aria-label="Projeto" value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); load(activeQuery, e.target.value); }}
              style={{ ...input, width: "auto", fontSize: 12, padding: "7px 10px", cursor: "pointer" }}>
              <option value="">Todos os projetos</option>
              {projects.map((p) => <option key={p.id} value={p.id}>📁 {p.name}</option>)}
            </select>
          )}
          {queries.length > 0 && (
            <select aria-label="Busca" value={activeQuery} disabled={!!projectFilter} onChange={(e) => { setActiveQuery(e.target.value); load(e.target.value, ""); }}
              style={{ ...input, width: "auto", fontSize: 12, padding: "7px 10px", cursor: "pointer" }}>
              <option value="">Todas as buscas</option>
              {queries.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          )}
          <select aria-label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProspectStatus | "")}
            style={{ ...input, width: "auto", fontSize: 12, padding: "7px 10px", cursor: "pointer" }}>
            <option value="">Todos os status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: C.body, cursor: "pointer" }}>
            <input type="checkbox" checked={onlyNoSite} onChange={(e) => setOnlyNoSite(e.target.checked)} /> Só sem site
          </label>
          <span style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>
            {rows.length} empresas · <strong style={{ color: "#F87171" }}>{hot} {hot === 1 ? "quente" : "quentes"}</strong> · <strong style={{ color: "#FBBF24" }}>{noSite} sem site</strong>
          </span>
        </div>
      )}

      {mode === "cidade" && visible.map((p) => {
        const st = p.status ?? "novo";
        const isOpen = open === p.place_id;
        return (
          <div key={p.place_id} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
            <div className="prospect-row" onClick={() => setOpen(isOpen ? null : p.place_id)} style={{ cursor: "pointer" }}>
              <div title="Nota de oportunidade" style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", border: `2px solid ${scoreColor(p.score)}`, color: scoreColor(p.score) }}>
                <strong style={{ fontSize: 18, lineHeight: 1 }}>{p.score}</strong><span style={{ fontSize: 9 }}>pontos</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 14 }}>{p.name}</strong>
                  {(!p.website || p.issues.some((i) => i.code === "social_only")) && <span style={{ fontSize: 10, fontWeight: 800, color: "#1C1000", background: "#FBBF24", borderRadius: 4, padding: "2px 6px" }}>{p.website ? "SÓ REDE SOCIAL" : "SEM SITE"}</span>}
                  <span style={{ fontSize: 11, color: STATUS_COLOR[st] }}>● {STATUS_LABEL[st]}</span>
                  {isDue(p.next_followup_at) && <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: "#DC2626", borderRadius: 4, padding: "2px 6px" }}>⏰ LEMBRETE</span>}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                  #{p.rank_in_search} na busca · ⭐ {p.rating ?? "–"} ({p.reviews_count}) · {p.phone || "sem telefone"}
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                  {p.issues.map((i) => (
                    <span key={i.code} style={{ fontSize: 10.5, color: C.body, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px" }}>{i.label}</span>
                  ))}
                </div>
              </div>
              <span style={{ color: C.dim, fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
            </div>

            {isOpen && (
              <div style={{ padding: "4px 16px 16px 82px", borderTop: `1px solid ${C.border}` }} className="prospect-detail">
                <ul style={{ margin: "12px 0", paddingLeft: 18, color: C.body, fontSize: 13, lineHeight: 1.7 }}>
                  {p.issues.length ? p.issues.map((i) => <li key={i.code}><strong>{i.label}:</strong> {i.detail}</li>) : <li>Perfil bem cuidado — pouca oportunidade.</li>}
                </ul>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
                  📍 {p.address || "sem endereço"}{" · "}
                  {p.maps_url && <a href={p.maps_url} target="_blank" rel="noreferrer" style={{ color: C.blue }}>Ver no Google Maps</a>}
                  {p.website && <> · <a href={p.website} target="_blank" rel="noreferrer" style={{ color: C.blue }}>Site atual</a></>}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {projects.length > 0 && (
                    <select aria-label="Projeto do lead" value={p.project_id ?? ""} onChange={(e) => { update(p, { project_id: e.target.value || null }); setTimeout(loadProjects, 400); }}
                      style={{ ...input, width: "auto", fontSize: 12, padding: "7px 10px", cursor: "pointer" }}>
                      <option value="">Sem projeto</option>
                      {projects.map((pr) => <option key={pr.id} value={pr.id}>📁 {pr.name}</option>)}
                    </select>
                  )}
                  <select aria-label="Mudar status" value={st} onChange={(e) => { update(p, { status: e.target.value as ProspectStatus }); setTimeout(loadProjects, 400); }}
                    style={{ ...input, width: "auto", fontSize: 12, padding: "7px 10px", cursor: "pointer" }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                  <button type="button" onClick={() => {
                    const [v, c] = (p.query || "").split(" em ");
                    onCreateClient(p, competitorsText(rows.filter((r) => r.query === p.query), p), v ?? "", c ?? "");
                  }} style={btn(primary)}>
                    {p.client_id ? "Abrir execução →" : "🎯 Trabalhar este lead →"}
                  </button>
                  {p.id && (
                    <button type="button" onClick={() => setSiteFor(siteFor === p.id ? null : p.id!)}
                      style={btn(siteFor === p.id ? "#7C3AED" : C.panel2, siteFor === p.id ? "#fff" : C.blue, { border: `1px solid ${C.border}` })}>
                      🌐 {siteFor === p.id ? "Fechar site" : "Site de prévia"}
                    </button>
                  )}
                  {p.id && (
                    <button type="button" onClick={() => setWaFor(waFor === p.id ? null : p.id!)}
                      style={btn(waFor === p.id ? "#16A34A" : C.panel2, waFor === p.id ? "#fff" : "#4ADE80", { border: `1px solid ${C.border}` })}>
                      📲 {waFor === p.id ? "Fechar abordagem" : "Abordar no WhatsApp"}
                    </button>
                  )}
                </div>
                {waFor === p.id && p.id && (
                  <div className="dash-card" style={{ marginTop: 12 }}>
                    <h3 className="dash-title">📲 Abordagem — {p.name}</h3>
                    <OutreachComposer lead={p} sender={sender}
                      leaderReviews={Math.max(0, ...rows.filter((r) => r.query === p.query && r.place_id !== p.place_id).map((r) => r.reviews_count))}
                      onUpdated={(row) => { setRows((rs) => rs.map((r) => (r.place_id === p.place_id ? { ...r, ...row } : r))); setTimeout(loadProjects, 300); }} />
                  </div>
                )}
                {siteFor === p.id && p.id && (
                  <div className="dash-card" style={{ marginTop: 12 }}>
                    <h3 className="dash-title">🌐 Site de prévia — {p.name}</h3>
                    <p className="dash-sub">Gere, publique e mande o link no WhatsApp. A página fica marcada como prévia e fora do Google.</p>
                    <SiteBuilder target={{ prospectId: p.id }} aiEnabled={aiEnabled} />
                  </div>
                )}
                <textarea aria-label="Anotações" defaultValue={p.notes ?? ""} placeholder="Anotações da abordagem…"
                  onBlur={(e) => e.target.value !== (p.notes ?? "") && update(p, { notes: e.target.value })}
                  style={{ ...input, marginTop: 10, minHeight: 60, fontSize: 12.5, resize: "vertical" }} />
              </div>
            )}
          </div>
        );
      })}

      {mode === "cidade" && !rows.length && !busy && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: C.dim, fontSize: 13 }}>
          Faça uma busca para encontrar empresas com perfil fraco no Google Maps. Não sabe por qual cidade começar? Use 🧭 Onde prospectar.
        </div>
      )}
    </div>
  );
}
