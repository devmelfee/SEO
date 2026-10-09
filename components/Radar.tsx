"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { STATUSES, type Issue, type ProspectStatus } from "@/lib/opportunity";
import { VERTICALS } from "@/lib/phases";
import { HOT, REGION_PRESETS } from "@/lib/market";
import { RegionDashboard, type RegionResult } from "./RegionDashboard";
import { ProjectsPanel, type Project } from "./ProjectsPanel";
import { SiteBuilder } from "./SiteBuilder";
import { OutreachComposer, type Sender } from "./Outreach";
import { isDue } from "@/lib/outreach";
import { UsageBar, type MyUsage } from "./Usage";
import { ContactBadge, ContactCheck, type ContactFields } from "./Contact";
import { C, btn, input, label, primary } from "./styles";

export type Prospect = {
  id?: string; place_id: string; query: string; name: string; address: string; phone: string; website: string;
  maps_url: string; rating: number | null; reviews_count: number; primary_type: string; has_hours: boolean;
  photos_count: number; rank_in_search: number; score: number; issues: Issue[]; status?: ProspectStatus; notes?: string;
  client_id?: string | null; project_id?: string | null;
  contact_step?: number | null; last_contact_at?: string | null; next_followup_at?: string | null;
} & ContactFields;

type Mode = "cidade" | "regiao" | "projetos";
const UI_KEY = "seo_radar_ui_v1";
type UiState = { mode: Mode; vertical: string; city: string; max: 20 | 40 | 60; citiesText: string; activeQuery: string; projectFilter: string; batchId: string };
function readUi(): Partial<UiState> { try { return JSON.parse(localStorage.getItem(UI_KEY) ?? "{}"); } catch { return {}; } }

const STATUS_LABEL: Record<ProspectStatus, string> = {
  novo: "Novo", abordado: "Abordado", respondeu: "Respondeu", proposta: "Proposta enviada", fechado: "Fechado", descartado: "Descartado",
};
const STATUS_COLOR: Record<ProspectStatus, string> = {
  novo: C.blue, abordado: "#D97706", respondeu: "#DB2777", proposta: "#0F766E", fechado: C.green, descartado: C.dim,
};

const chip = { ...input, width: "auto", flexShrink: 0, fontSize: 13, padding: "7px 10px", minHeight: 36, borderRadius: 999, cursor: "pointer", border: `1px solid ${C.border}` } as const;
// Nota alta = boa oportunidade (cor quente); nota baixa = pouca coisa a vender (cinza).
export const scoreBg = (s: number) => (s >= 60 ? "#FFF7ED" : s >= 35 ? "#FFFBEB" : "#F1F5F9");

export function scoreColor(s: number) {
  return s >= 60 ? "#C2410C" : s >= 35 ? "#B45309" : "#64748B";
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
  const [mode, setMode] = useState<Mode>(ui0.mode && ui0.mode !== ("abordagem" as string) ? ui0.mode : "cidade");
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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [checkFor, setCheckFor] = useState<string | null>(null);
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
  const loadFavorites = () => api<{ query: string }[]>("/api/favorites").then((r) => setFavorites(r.map((f) => f.query))).catch(() => {});
  const toggleFavorite = async (q: string) => {
    const on = favorites.includes(q);
    setFavorites((f) => (on ? f.filter((x) => x !== q) : [q, ...f]));
    try { await api(on ? `/api/favorites?query=${encodeURIComponent(q)}` : "/api/favorites", on ? { method: "DELETE" } : { body: { query: q } }); }
    catch (e) { setErr((e as Error).message); loadFavorites(); }
  };
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
    load(); loadProjects(); loadBatches(); loadFavorites();
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div role="tablist" aria-label="Modo" className="seg">
          {([["cidade", "Buscar"], ["regiao", "Onde prospectar"], ["projetos", `Projetos${projects.length ? ` (${projects.length})` : ""}`]] as const).map(([m, l]) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}>{l}</button>
          ))}
        </div>
        <UsageBar u={usage} />
      </div>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        {mode === "projetos" && <p style={{ margin: 0, fontSize: 13.5, color: C.muted }}>Agrupe leads por campanha e acompanhe o funil de cada uma.</p>}
        {(mode === "cidade" || mode === "regiao") && (<>
        <div className="radar-form">
          <div style={{ flex: 2 }}><label style={label} htmlFor="radar-niche">Nicho</label>
            <input id="radar-niche" list="radar-verticals" value={vertical} onChange={(e) => setVertical(e.target.value)}
              placeholder="Ex: Pet shop, Dentistas…" style={input} />
            <datalist id="radar-verticals">{VERTICALS.map((v) => <option key={v} value={v} />)}</datalist>
          </div>
          {mode === "cidade" ? (
            <>
              <div style={{ flex: 2 }}><label style={label} htmlFor="radar-city">Cidade ou bairro</label>
                <input id="radar-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Jundiaí" style={input}
                  onKeyDown={(e) => e.key === "Enter" && canSearch && search()} />
              </div>
              <div style={{ flex: "0 1 90px", minWidth: 90 }}><label style={label}>Quantos</label>
                <select value={max} onChange={(e) => setMax(Number(e.target.value) as 20 | 40 | 60)} style={{ ...input, cursor: "pointer" }}>
                  <option value={20}>20</option><option value={40}>40</option><option value={60}>60</option>
                </select>
              </div>
              <button type="button" onClick={search} disabled={!canSearch}
                style={btn(canSearch ? "#0F766E" : C.border, canSearch ? "#fff" : C.dim, { padding: "12px 22px", fontSize: 14, minHeight: 46, flex: "1 1 120px" })}>
                {busy ? "Buscando…" : "Buscar"}
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
              style={btn(canRegion ? "#0F766E" : C.border, canRegion ? "#fff" : C.dim, { padding: "12px 22px", fontSize: 13 })}>
              {regionBusy ? `Analisando ${cityList.length} cidades…` : `Comparar ${cityList.length || ""} cidades`}
            </button>
            <span style={{ fontSize: 12.5, color: C.muted }}>Usa 1 consulta por cidade.</span>
          </div>
        )}
        </>)}
        {!placesEnabled && <p style={{ color: "#B45309", fontSize: 12, margin: "12px 0 0" }}>⚠ Busca desligada: falta GOOGLE_PLACES_API_KEY (e o faturamento ativo no Google Cloud).</p>}
        {!supabaseOn && <p style={{ color: "#B45309", fontSize: 12, margin: "8px 0 0" }}>⚠ Supabase desligado: os leads não serão salvos.</p>}
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

      {mode === "cidade" && (rows.length > 0 || queries.length > 0 || !!projectFilter) && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, margin: "4px 2px 8px" }}>
            <strong style={{ fontSize: 15 }}>{visible.length} {visible.length === 1 ? "empresa" : "empresas"}</strong>
            <span style={{ fontSize: 12.5, color: C.muted }}>{hot} com nota alta · {noSite} sem site</span>
          </div>
          {favorites.length > 0 && (
            <div className="chips" style={{ marginBottom: 8 }} aria-label="Buscas favoritas">
              {favorites.map((q) => {
                const on = !projectFilter && activeQuery === q;
                return (
                  <button key={q} type="button" aria-pressed={on} onClick={() => { setProjectFilter(""); setActiveQuery(q); load(q, ""); }}
                    style={{ ...chip, background: on ? "#FFFBEB" : "#fff", borderColor: on ? "#FCD34D" : C.border, color: C.text }}>
                    <span style={{ color: "#D97706" }}>★</span> {q}
                  </button>
                );
              })}
            </div>
          )}
          <div className="chips" style={{ marginBottom: 12 }}>
            {queries.length > 0 && (
              <select aria-label="Busca" value={projectFilter ? "" : activeQuery} disabled={!!projectFilter} onChange={(e) => { setActiveQuery(e.target.value); load(e.target.value, ""); }} style={chip}>
                <option value="">Todas as buscas</option>
                {[...queries].sort((a, b) => Number(favorites.includes(b)) - Number(favorites.includes(a))).map((q) => <option key={q} value={q}>{favorites.includes(q) ? "★ " : ""}{q}</option>)}
              </select>
            )}
            {activeQuery && !projectFilter && (
              <button type="button" aria-pressed={favorites.includes(activeQuery)} onClick={() => toggleFavorite(activeQuery)}
                title={favorites.includes(activeQuery) ? "Tirar dos favoritos" : "Favoritar esta busca"}
                style={{ ...chip, color: favorites.includes(activeQuery) ? "#D97706" : C.muted }}>
                {favorites.includes(activeQuery) ? "★ Favorita" : "☆ Favoritar"}
              </button>
            )}
            {projects.length > 0 && (
              <select aria-label="Projeto" value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); load(activeQuery, e.target.value); }} style={chip}>
                <option value="">Todos os projetos</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <select aria-label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProspectStatus | "")} style={chip}>
              <option value="">Qualquer status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <button type="button" aria-pressed={onlyNoSite} onClick={() => setOnlyNoSite(!onlyNoSite)}
              style={{ ...chip, background: onlyNoSite ? "#F0FDFA" : "#fff", color: onlyNoSite ? C.teal : C.body, borderColor: onlyNoSite ? "#99F6E4" : C.border }}>
              {onlyNoSite ? "✓ " : ""}Sem site
            </button>
          </div>
        </>
      )}

      {mode === "cidade" && visible.map((p) => {
        const st = p.status ?? "novo";
        const isOpen = open === p.place_id;
        const noOwnSite = !p.website || p.issues.some((i) => i.code === "social_only");
        const due = isDue(p.next_followup_at);
        return (
          <div key={p.place_id} className="card" style={{ marginBottom: 8, overflow: "hidden" }}>
            <div className="prospect-row" role="button" tabIndex={0} aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : p.place_id)} onKeyDown={(e) => e.key === "Enter" && setOpen(isOpen ? null : p.place_id)} style={{ cursor: "pointer" }}>
              <span title="Nota de oportunidade (0–100): quanto maior, mais fácil de vender" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: "flex",
                alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, background: scoreBg(p.score), color: scoreColor(p.score) }}>{p.score}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  ★ {p.rating ?? "–"} ({p.reviews_count}){noOwnSite ? ` · ${p.website ? "só rede social" : "sem site"}` : ""} · <span style={{ color: due ? "#DC2626" : STATUS_COLOR[st] }}>{due ? "lembrete hoje" : STATUS_LABEL[st]}</span>
                  {(p.contact_status && p.contact_status !== "nao_verificado") || p.decision_maker ? <> · <ContactBadge p={p} /></> : null}
                </div>
              </div>
              <span aria-hidden style={{ color: C.faint, fontSize: 14 }}>{isOpen ? "▴" : "▾"}</span>
            </div>

            {isOpen && (
              <div className="prospect-detail">
                <ul style={{ margin: "12px 0", paddingLeft: 18, color: C.body, fontSize: 13.5, lineHeight: 1.6 }}>
                  {p.issues.length ? p.issues.map((i) => <li key={i.code}><strong>{i.label}:</strong> {i.detail}</li>) : <li>Perfil bem cuidado — pouca oportunidade.</li>}
                </ul>
                <div className="lead-actions" style={{ marginBottom: 10 }}>
                  {p.id && (
                    <button type="button" onClick={() => setWaFor(waFor === p.id ? null : p.id!)} style={btn("#16A34A", "#fff")}>
                      {waFor === p.id ? "Fechar mensagem" : "Chamar no WhatsApp"}
                    </button>
                  )}
                  <button type="button" onClick={() => {
                    const [v, c] = (p.query || "").split(" em ");
                    onCreateClient(p, competitorsText(rows.filter((r) => r.query === p.query), p), v ?? "", c ?? "");
                  }} style={btn(primary)}>
                    {p.client_id ? "Abrir cliente →" : "Virar cliente →"}
                  </button>
                  {p.id && (
                    <button type="button" onClick={() => setSiteFor(siteFor === p.id ? null : p.id!)} style={btn("#fff", C.body, { border: `1px solid ${C.border}` })}>
                      {siteFor === p.id ? "Fechar site" : "Site de prévia"}
                    </button>
                  )}
                  {p.id && (
                    <button type="button" onClick={() => setCheckFor(checkFor === p.id ? null : p.id!)} style={btn("#fff", C.body, { border: `1px solid ${C.border}` })}>
                      {checkFor === p.id ? "Fechar validação" : "Validar contato"}
                    </button>
                  )}
                </div>
                {waFor === p.id && p.id && (
                  <div className="dash-card" style={{ marginBottom: 10 }}>
                    <OutreachComposer lead={p} sender={sender}
                      leaderReviews={Math.max(0, ...rows.filter((r) => r.query === p.query && r.place_id !== p.place_id).map((r) => r.reviews_count))}
                      onUpdated={(row) => { setRows((rs) => rs.map((r) => (r.place_id === p.place_id ? { ...r, ...row } : r))); setTimeout(loadProjects, 300); }} />
                  </div>
                )}
                {checkFor === p.id && p.id && (
                  <div className="dash-card" style={{ marginBottom: 10 }}>
                    <ContactCheck lead={p} onUpdated={(row) => setRows((rs) => rs.map((r) => (r.place_id === p.place_id ? { ...r, ...row } : r)))} />
                  </div>
                )}
                {siteFor === p.id && p.id && (
                  <div className="dash-card" style={{ marginBottom: 10 }}>
                    <p className="dash-sub">O link vai junto na mensagem do WhatsApp. A página fica fora do Google.</p>
                    <SiteBuilder target={{ prospectId: p.id }} aiEnabled={aiEnabled} />
                  </div>
                )}
                <details>
                  <summary style={{ cursor: "pointer", fontSize: 13, color: C.muted, padding: "4px 0" }}>Mais detalhes · status, projeto e anotações</summary>
                  <div style={{ fontSize: 13, color: C.muted, margin: "8px 0" }}>
                    {p.address || "sem endereço"} · {p.phone || "sem telefone"} · #{p.rank_in_search} na busca
                    {p.maps_url && <> · <a href={p.maps_url} target="_blank" rel="noreferrer">ver no Maps</a></>}
                    {p.website && <> · <a href={p.website} target="_blank" rel="noreferrer">site atual</a></>}
                  </div>
                  <div className="lead-actions">
                    <select aria-label="Mudar status" value={st} onChange={(e) => { update(p, { status: e.target.value as ProspectStatus }); setTimeout(loadProjects, 400); }} style={chip}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                    {projects.length > 0 && (
                      <select aria-label="Projeto do lead" value={p.project_id ?? ""} onChange={(e) => { update(p, { project_id: e.target.value || null }); setTimeout(loadProjects, 400); }} style={chip}>
                        <option value="">Sem projeto</option>
                        {projects.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                      </select>
                    )}
                  </div>
                  <textarea aria-label="Anotações" defaultValue={p.notes ?? ""} placeholder="Anotações…"
                    onBlur={(e) => e.target.value !== (p.notes ?? "") && update(p, { notes: e.target.value })}
                    style={{ ...input, marginTop: 10, minHeight: 60, fontSize: 13, resize: "vertical" }} />
                </details>
              </div>
            )}
          </div>
        );
      })}

      {mode === "cidade" && !rows.length && !busy && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: C.dim, fontSize: 13 }}>
          Digite um nicho e uma cidade para ver as empresas com mais oportunidade.<br />Não sabe onde começar? Use <strong>Onde prospectar</strong>.
        </div>
      )}
    </div>
  );
}
