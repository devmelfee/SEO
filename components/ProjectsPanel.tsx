"use client";
import { useState } from "react";
import { C, btn, input, primary } from "./styles";

export type Project = {
  id: string; name: string; niche: string; notes: string; created_by: string; updated_at: string;
  stats: { total: number; novo: number; abordado: number; respondeu: number; proposta: number; fechado: number; descartado: number; quentes: number };
};

// Etapas do funil em ordem; cores de status reservadas para o andamento (com rótulo ao lado, nunca só a cor).
const STAGES: [keyof Project["stats"], string, string][] = [
  ["novo", "Novos", "#2563EB"], ["abordado", "Abordados", "#D97706"], ["respondeu", "Responderam", "#DB2777"], ["proposta", "Proposta", "#0F766E"], ["fechado", "Fechados", "#059669"],
];

export function ProjectsPanel({ projects, onOpen, onCreate, onDelete }: {
  projects: Project[];
  onOpen: (p: Project) => void;
  onCreate: (name: string, niche: string) => Promise<unknown>;
  onDelete: (p: Project) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");
  const [err, setErr] = useState("");

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    try { await onCreate(name.trim(), niche.trim()); setName(""); setNiche(""); } catch (x) { setErr((x as Error).message); }
  };

  return (
    <div>
      <form onSubmit={create} className="dash-card" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <strong style={{ fontSize: 13, marginRight: 6 }}>Novo projeto</strong>
        <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pet shops — Região de Jundiaí" aria-label="Nome do projeto"
          style={{ ...input, flex: 2, minWidth: 200, fontSize: 13 }} />
        <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Nicho (opcional)" aria-label="Nicho do projeto"
          style={{ ...input, flex: 1, minWidth: 140, fontSize: 13 }} />
        <button type="submit" style={btn(primary)}>+ Criar</button>
        {err && <span style={{ color: C.red, fontSize: 12 }}>⚠ {err}</span>}
      </form>

      {!projects.length && (
        <p style={{ color: C.dim, fontSize: 13, textAlign: "center", padding: "32px 0" }}>
          Nenhum projeto ainda. Crie um aqui ou selecione cidades em Onde prospectar e clique em "Adicionar".
        </p>
      )}

      <div className="projects-grid">
        {projects.map((p) => {
          const s = p.stats; const active = s.total - s.descartado;
          return (
            <article key={p.id} className="dash-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <h3 className="dash-title" style={{ margin: 0 }}>{p.name}</h3>
                  <div style={{ fontSize: 11, color: C.muted }}>{p.niche || "—"} · atualizado {new Date(p.updated_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <strong style={{ fontSize: 22 }}>{s.total}<span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}> leads</span></strong>
              </div>
              {/* Funil empilhado: largura = parte dos leads ativos em cada etapa */}
              <div style={{ display: "flex", gap: 2, height: 10, margin: "14px 0 8px", background: C.panel2, borderRadius: 4, overflow: "hidden" }}
                role="img" aria-label={STAGES.map(([k, l]) => `${l}: ${s[k]}`).join(", ")}>
                {active > 0 && STAGES.map(([k, l, c]) => s[k] > 0 && (
                  <div key={k} title={`${l}: ${s[k]}`} style={{ width: `${(100 * s[k]) / active}%`, background: c }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: C.body }}>
                {STAGES.map(([k, l, c]) => (
                  <span key={k}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: c, marginRight: 5 }} />{l} <strong>{s[k]}</strong></span>
                ))}
                <span style={{ color: C.muted }}>{s.quentes} quentes · {s.descartado} descartados</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button type="button" onClick={() => onOpen(p)} style={btn(primary)}>Trabalhar leads →</button>
                <button type="button" onClick={() => confirm(`Apagar o projeto "${p.name}"? Os leads continuam no Radar.`) && onDelete(p)}
                  style={btn("transparent", C.red, { border: `1px solid ${C.border}` })}>Apagar</button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
