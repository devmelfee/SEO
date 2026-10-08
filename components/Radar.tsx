"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { STATUSES, type Issue, type ProspectStatus } from "@/lib/opportunity";
import { VERTICALS } from "@/lib/phases";
import { C, btn, input, label, primary } from "./styles";

export type Prospect = {
  id?: string; place_id: string; query: string; name: string; address: string; phone: string; website: string;
  maps_url: string; rating: number | null; reviews_count: number; primary_type: string; has_hours: boolean;
  photos_count: number; rank_in_search: number; score: number; issues: Issue[]; status?: ProspectStatus; notes?: string;
  client_id?: string | null;
};

const STATUS_LABEL: Record<ProspectStatus, string> = {
  novo: "Novo", abordado: "Abordado", proposta: "Proposta enviada", fechado: "Fechado", descartado: "Descartado",
};
const STATUS_COLOR: Record<ProspectStatus, string> = {
  novo: C.blue, abordado: "#FBBF24", proposta: "#A78BFA", fechado: C.green, descartado: C.dim,
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

export function Radar({ placesEnabled, supabaseOn, onCreateClient }: {
  placesEnabled: boolean; supabaseOn: boolean;
  onCreateClient: (p: Prospect, competitors: string, vertical: string, city: string) => void;
}) {
  const [vertical, setVertical] = useState("");
  const [city, setCity] = useState("");
  const [max, setMax] = useState<20 | 40 | 60>(20);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState<Prospect[]>([]);
  const [queries, setQueries] = useState<string[]>([]);
  const [activeQuery, setActiveQuery] = useState("");
  const [onlyNoSite, setOnlyNoSite] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | ProspectStatus>("");
  const [open, setOpen] = useState<string | null>(null);

  const load = async (query = activeQuery) => {
    if (!supabaseOn) return;
    try {
      const r = await api<{ prospects: Prospect[]; queries: string[] }>(`/api/prospects${query ? `?query=${encodeURIComponent(query)}` : ""}`);
      setRows(r.prospects); setQueries(r.queries);
    } catch (e) { setErr((e as Error).message); }
  };
  useEffect(() => { load(""); }, [supabaseOn]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = async () => {
    const query = `${vertical.trim()} em ${city.trim()}`;
    setBusy(true); setErr("");
    try {
      const r = await api<{ prospects: Prospect[] }>("/api/radar", { body: { query, max } });
      setRows(r.prospects); setActiveQuery(query);
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
  const hot = rows.filter((r) => r.score >= 60).length;
  const canSearch = placesEnabled && vertical.trim().length > 1 && city.trim().length > 1 && !busy;

  return (
    <div>
      <div style={{ background: C.panel, border: `1px solid #7C3AED40`, borderLeft: "4px solid #7C3AED", borderRadius: 12, padding: "18px 22px", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>📡 Radar de oportunidades</h1>
        <p style={{ margin: "4px 0 16px", fontSize: 13, color: C.dim }}>
          Busca empresas no Google Maps, aponta o que está faltando em cada uma e ordena da melhor oportunidade para a pior.
        </p>
        <div className="radar-form">
          <div style={{ flex: 2 }}><label style={label}>Nicho</label>
            <input list="radar-verticals" value={vertical} onChange={(e) => setVertical(e.target.value)} placeholder="Ex: Dentistas" style={input} />
            <datalist id="radar-verticals">{VERTICALS.map((v) => <option key={v} value={v} />)}</datalist>
          </div>
          <div style={{ flex: 2 }}><label style={label}>Cidade</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Jundiaí" style={input}
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
        </div>
        {!placesEnabled && <p style={{ color: "#FCD34D", fontSize: 12, margin: "12px 0 0" }}>⚠ Busca desligada: falta GOOGLE_PLACES_API_KEY (e o faturamento ativo no Google Cloud).</p>}
        {!supabaseOn && <p style={{ color: "#FCD34D", fontSize: 12, margin: "8px 0 0" }}>⚠ Supabase desligado: os leads não serão salvos.</p>}
        {err && <p role="alert" style={{ color: C.red, fontSize: 13, margin: "12px 0 0" }}>⚠ {err}</p>}
      </div>

      {(rows.length > 0 || queries.length > 0) && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
          {queries.length > 0 && (
            <select aria-label="Busca" value={activeQuery} onChange={(e) => { setActiveQuery(e.target.value); load(e.target.value); }}
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

      {visible.map((p) => {
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
                  <select aria-label="Mudar status" value={st} onChange={(e) => update(p, { status: e.target.value as ProspectStatus })}
                    style={{ ...input, width: "auto", fontSize: 12, padding: "7px 10px", cursor: "pointer" }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                  <button type="button" onClick={() => {
                    const [v, c] = (p.query || "").split(" em ");
                    onCreateClient(p, competitorsText(rows.filter((r) => r.query === p.query), p), v ?? "", c ?? "");
                  }} style={btn(primary)}>
                    {p.client_id ? "Abrir execução →" : "🎯 Trabalhar este lead →"}
                  </button>
                </div>
                <textarea aria-label="Anotações" defaultValue={p.notes ?? ""} placeholder="Anotações da abordagem…"
                  onBlur={(e) => e.target.value !== (p.notes ?? "") && update(p, { notes: e.target.value })}
                  style={{ ...input, marginTop: 10, minHeight: 60, fontSize: 12.5, resize: "vertical" }} />
              </div>
            )}
          </div>
        );
      })}

      {!rows.length && !busy && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: C.dim, fontSize: 13 }}>
          Faça uma busca para encontrar empresas com perfil fraco no Google Maps.
        </div>
      )}
    </div>
  );
}
