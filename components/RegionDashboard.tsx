"use client";
import { useMemo, useState } from "react";
import { C, btn, input, primary } from "./styles";

export type CitySummary = { total: number; noSite: number; avgReviews: number; leaderReviews: number; hot: number; opportunity: number };
export type RegionResult = {
  batchId?: string; niche: string; createdAt?: string;
  results: { city: string; query: string; error?: string; summary?: CitySummary }[];
};
export type ProjectLite = { id: string; name: string };

// Magnitude = um matiz só, do claro ao escuro (nada de vermelho/verde de "status" para índice).
const SEQ = [C.tealMist, "#5EEAD4", C.teal, C.teal, C.teal];
const seq = (v: number) => SEQ[Math.min(SEQ.length - 1, Math.floor(v / 20))];
const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

export function RegionDashboard({ region, projects, onOpenQuery, onAddToProject, onCreateProject }: {
  region: RegionResult;
  projects: ProjectLite[];
  onOpenQuery: (query: string) => void;
  onAddToProject: (projectId: string, queries: string[], filter: "all" | "hot" | "no_site") => Promise<number>;
  onCreateProject: (name: string, niche: string) => Promise<ProjectLite>;
}) {
  const ok = useMemo(() => region.results.filter((r) => r.summary && r.summary.total > 0)
    .sort((a, b) => b.summary!.opportunity - a.summary!.opportunity), [region]);
  const failed = region.results.filter((r) => !r.summary || r.summary.total === 0);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(ok.slice(0, 3).map((r) => r.query)));
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "__new");
  const [newName, setNewName] = useState(`${region.niche} — ${new Date().toLocaleDateString("pt-BR")}`);
  const [filter, setFilter] = useState<"all" | "hot" | "no_site">("hot");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  const tot = ok.reduce((a, r) => ({
    total: a.total + r.summary!.total, hot: a.hot + r.summary!.hot, noSite: a.noSite + r.summary!.noSite,
  }), { total: 0, hot: 0, noSite: 0 });
  const best = ok[0];

  const sel = ok.filter((r) => selected.has(r.query));
  const selCount = sel.reduce((a, r) => a + (filter === "all" ? r.summary!.total : filter === "hot" ? r.summary!.hot : r.summary!.noSite), 0);

  const toggle = (q: string) => setSelected((s) => { const n = new Set(s); n.has(q) ? n.delete(q) : n.add(q); return n; });

  const add = async () => {
    setBusy(true); setMsg("");
    try {
      let pid = projectId;
      if (pid === "__new") { const p = await onCreateProject(newName.trim(), region.niche); pid = p.id; setProjectId(p.id); }
      const n = await onAddToProject(pid, sel.map((r) => r.query), filter);
      setMsg(`✓ ${n} lead(s) adicionados ao projeto.`);
    } catch (e) { setMsg(`⚠ ${(e as Error).message}`); }
    setBusy(false);
  };

  // ── dispersão: x = concorrência (média de avaliações), y = % sem site, área = quentes ──
  const W = 560, H = 300, P = { l: 44, r: 16, t: 14, b: 38 };
  const maxX = Math.max(50, ...ok.map((r) => r.summary!.avgReviews)) * 1.1;
  const x = (v: number) => P.l + (v / maxX) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - v / 100) * (H - P.t - P.b);
  const maxHot = Math.max(1, ...ok.map((r) => r.summary!.hot));
  const rad = (h: number) => 6 + 12 * Math.sqrt(h / maxHot);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Números-resumo */}
      <div className="kpis">
        {[
          ["Cidades analisadas", String(ok.length), failed.length ? `${failed.length} sem resultado` : region.createdAt ? new Date(region.createdAt).toLocaleDateString("pt-BR") : ""],
          ["Empresas encontradas", String(tot.total), `${region.niche}`],
          ["Leads quentes", String(tot.hot), `${pct(tot.hot, tot.total)}% do total`],
          ["Sem site próprio", String(tot.noSite), `${pct(tot.noSite, tot.total)}% do total`],
          ["Melhor cidade", best?.city ?? "—", best ? `índice ${best.summary!.opportunity}` : ""],
        ].map(([k, v, s]) => (
          <div key={k} className="kpi">
            <div style={{ fontSize: 11, color: C.muted }}>{k}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "4px 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</div>
            <div style={{ fontSize: 11, color: C.dim }}>{s}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        {/* Ranking */}
        <section className="dash-card" aria-label="Ranking de cidades">
          <h3 className="dash-title">Índice de oportunidade por cidade</h3>
          <p className="dash-sub">0–100 · mais leads quentes, mais empresas sem site e concorrência mais fraca = maior índice</p>
          {ok.map((r) => {
            const s = r.summary!;
            return (
              <div key={r.query} className="bar-row" onMouseEnter={() => setHover(r.query)} onMouseLeave={() => setHover(null)}
                title={`${r.city}: índice ${s.opportunity} · ${s.total} empresas · ${s.hot} quentes · ${s.noSite} sem site · média ${s.avgReviews} avaliações`}>
                <span style={{ width: 120, fontSize: 12, color: hover === r.query ? C.text : C.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.city}</span>
                <div style={{ flex: 1, height: 14, background: C.panel2, borderRadius: 4 }}>
                  <div style={{ width: `${Math.max(2, s.opportunity)}%`, height: "100%", background: seq(s.opportunity), borderRadius: "0 4px 4px 0", opacity: hover && hover !== r.query ? 0.45 : 1 }} />
                </div>
                <strong style={{ width: 30, textAlign: "right", fontSize: 12 }}>{s.opportunity}</strong>
              </div>
            );
          })}
        </section>

        {/* Dispersão */}
        <section className="dash-card" aria-label="Mapa de posicionamento">
          <h3 className="dash-title">Onde atacar primeiro</h3>
          <p className="dash-sub">Mais para cima = mais empresas sem site · mais para a esquerda = concorrência mais fraca · bolha = leads quentes</p>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Gráfico de dispersão das cidades">
            <rect style={{ fill: C.teal }} x={P.l} y={P.t} width={(W - P.l - P.r) / 2} height={(H - P.t - P.b) / 2} opacity={0.08} />
            <text style={{ fill: C.teal }} x={P.l + 6} y={P.t + 14} fontSize={10}>melhor quadrante</text>
            {[0, 25, 50, 75, 100].map((t) => (
              <g key={t}>
                <line style={{ stroke: C.border }} x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} strokeWidth={1} />
                <text style={{ fill: C.muted }} x={P.l - 6} y={y(t) + 3} fontSize={10} textAnchor="end">{t}%</text>
              </g>
            ))}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <text style={{ fill: C.muted }} key={f} x={x(maxX * f)} y={H - P.b + 14} fontSize={10} textAnchor="middle">{Math.round(maxX * f)}</text>
            ))}
            <text style={{ fill: C.muted }} x={(W + P.l) / 2} y={H - 6} fontSize={10} textAnchor="middle">média de avaliações dos concorrentes</text>
            {ok.map((r) => {
              const s = r.summary!; const cx = x(s.avgReviews), cy = y(pct(s.noSite, s.total)); const on = hover === r.query;
              return (
                <g key={r.query} onMouseEnter={() => setHover(r.query)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }} onClick={() => toggle(r.query)}>
                  <title>{`${r.city}: ${pct(s.noSite, s.total)}% sem site · média ${s.avgReviews} avaliações · ${s.hot} quentes · índice ${s.opportunity}`}</title>
                  <circle cx={cx} cy={cy} r={rad(s.hot) + 8} fill="transparent" />
                  <circle style={{ fill: seq(s.opportunity), stroke: on ? C.text : C.panel }} cx={cx} cy={cy} r={rad(s.hot)} fillOpacity={selected.has(r.query) ? 0.95 : 0.55}
                    strokeWidth={2} />
                  <text style={{ fill: on ? C.text : C.body }} x={cx} y={cy - rad(s.hot) - 4} fontSize={10.5} textAnchor="middle">{r.city}</text>
                </g>
              );
            })}
          </svg>
        </section>
      </div>

      {/* Seleção e ação */}
      <section className="dash-card" aria-label="Selecionar cidades">
        <h3 className="dash-title">Selecionar cidades e levar para um projeto</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="dash-table">
            <thead><tr><th /><th>Cidade</th><th>Índice</th><th>Empresas</th><th>Quentes</th><th>Sem site</th><th>Média aval.</th><th>Líder</th><th /></tr></thead>
            <tbody>
              {ok.map((r) => { const s = r.summary!; return (
                <tr key={r.query} className={selected.has(r.query) ? "on" : ""}>
                  <td><input type="checkbox" aria-label={`Selecionar ${r.city}`} checked={selected.has(r.query)} onChange={() => toggle(r.query)} /></td>
                  <td>{r.city}</td><td><strong>{s.opportunity}</strong></td><td>{s.total}</td><td>{s.hot}</td>
                  <td>{s.noSite} <span style={{ color: C.dim }}>({pct(s.noSite, s.total)}%)</span></td><td>{s.avgReviews}</td><td>{s.leaderReviews}</td>
                  <td><button type="button" onClick={() => onOpenQuery(r.query)} style={btn("transparent", C.blue, { padding: "2px 6px", fontSize: 12 })}>Ver leads →</button></td>
                </tr>
              ); })}
              {failed.map((r) => (
                <tr key={r.query}><td /><td>{r.city}</td><td colSpan={7} style={{ color: C.red }}>{r.error ?? "nenhuma empresa encontrada"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
          <button type="button" onClick={() => setSelected(new Set(ok.map((r) => r.query)))} style={btn(C.panel2, C.body, { border: `1px solid ${C.border}` })}>Todas</button>
          <button type="button" onClick={() => setSelected(new Set())} style={btn(C.panel2, C.body, { border: `1px solid ${C.border}` })}>Nenhuma</button>
          <select aria-label="Quais leads" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} style={{ ...input, width: "auto", fontSize: 12, padding: "7px 10px" }}>
            <option value="hot">Só leads quentes</option><option value="no_site">Só sem site</option><option value="all">Todos os leads</option>
          </select>
          <span style={{ color: C.muted, fontSize: 12 }}>para</span>
          <select aria-label="Projeto" value={projectId} onChange={(e) => setProjectId(e.target.value)} style={{ ...input, width: "auto", fontSize: 12, padding: "7px 10px" }}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="__new">+ Novo projeto…</option>
          </select>
          {projectId === "__new" && (
            <input aria-label="Nome do novo projeto" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ ...input, width: 240, fontSize: 12, padding: "7px 10px" }} />
          )}
          <button type="button" disabled={busy || !sel.length || (projectId === "__new" && newName.trim().length < 2)} onClick={add}
            style={btn(sel.length ? primary : C.border, sel.length ? C.onAccent : C.dim)}>
            {busy ? "Adicionando…" : `Adicionar ${sel.length} cidade(s) · ~${selCount} leads`}
          </button>
          {msg && <span role="status" style={{ fontSize: 12, color: msg.startsWith("✓") ? C.green : C.red }}>{msg}</span>}
        </div>
      </section>
    </div>
  );
}
