"use client";
import { useEffect, useState } from "react";
import { CURRENCIES, PRICING_OPTIONS, slugify, type FormData } from "@/lib/phases";
import { api, copyText, downloadTxt, generateText, type ClientRow, type Section, type Status } from "@/lib/api";
import { C, btn, input, label, overlay, primary } from "./styles";

export type Agency = {
  name?: string; consultant?: string; email?: string; whatsapp?: string; currency?: string;
  default_vertical?: string; default_city?: string; default_pricing?: string;
};

function Shell({ title, subtitle, onClose, width = 560, children, footer }: {
  title: string; subtitle?: string; onClose: () => void; width?: number; children: React.ReactNode; footer?: React.ReactNode;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div style={overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={title} style={{ background: C.panel, border: `1px solid ${C.borderBlue}`, borderRadius: 16, width: "100%",
        maxWidth: width, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{title}</h2>
            {subtitle && <p style={{ margin: "2px 0 0", fontSize: 12, color: C.dim }}>{subtitle}</p>}
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} style={btn(C.border, "#94A3B8", { width: 32, height: 32, padding: 0, fontSize: 15 })}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>{children}</div>
        {footer && <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>{footer}</div>}
      </div>
    </div>
  );
}

// ─── Configurações ───────────────────────────────────────────────────────────

export function SettingsModal({ settings, status, onSave, onClose }: {
  settings: Agency; status: Status | null; onSave: (s: Agency) => Promise<void>; onClose: () => void;
}) {
  const [tab, setTab] = useState<"agency" | "defaults" | "status">("agency");
  const [form, setForm] = useState<Agency>(settings);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState("");
  const set = (k: keyof Agency, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setState("saving"); setErr("");
    try { await onSave(form); setState("saved"); setTimeout(() => setState("idle"), 2000); }
    catch (e) { setState("error"); setErr((e as Error).message); }
  };

  const field = (k: keyof Agency, lbl: string, ph: string, type = "text") => (
    <div><label style={label}>{lbl}</label>
      <input type={type} value={form[k] ?? ""} placeholder={ph} onChange={(e) => set(k, e.target.value)} style={{ ...input, fontSize: 13 }} /></div>
  );

  const row = (ok: boolean | undefined, name: string, env: string, help: string) => (
    <div style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 16 }}>{ok ? "🟢" : "⚫"}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: ok ? "#6EE7B7" : C.text }}>{name} {ok ? "— conectado" : "— falta configurar"}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}><code style={{ color: C.blue }}>{env}</code> · {help}</div>
      </div>
    </div>
  );

  return (
    <Shell title="⚙️ Configurações" subtitle="Dados da agência ficam no Supabase; chaves ficam só na Vercel" onClose={onClose}
      footer={tab !== "status" && <>
        {err && <span style={{ color: C.red, fontSize: 12, marginRight: "auto", alignSelf: "center" }}>{err}</span>}
        <button type="button" onClick={onClose} style={btn("transparent", C.muted, { border: `1px solid ${C.border}`, fontSize: 13 })}>Cancelar</button>
        <button type="button" onClick={save} disabled={state === "saving"} style={btn(state === "saving" ? C.border : primary, "#fff", { fontSize: 13, padding: "9px 22px" })}>
          {state === "saved" ? "✓ Salvo!" : state === "saving" ? "Salvando…" : "Salvar"}
        </button>
      </>}>
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {([["agency", "🏢 Agência"], ["defaults", "🎯 Padrões"], ["status", "🔌 Conexões"]] as const).map(([t, l]) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            style={btn(tab === t ? C.panel2 : "transparent", tab === t ? C.blue : C.dim, { borderBottom: `2px solid ${tab === t ? C.teal : "transparent"}`, borderRadius: "8px 8px 0 0" })}>{l}</button>
        ))}
      </div>

      {tab === "agency" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Aparecem no cabeçalho dos relatórios e downloads.</p>
          {field("name", "Nome da agência", "Ex: Alventra Marketing")}
          {field("consultant", "Nome do consultor", "Ex: Maria Souza")}
          {field("email", "E-mail de contato", "contato@agencia.com", "email")}
          {field("whatsapp", "WhatsApp", "+55 11 99999-9999")}
          <div><label style={label}>Moeda</label>
            <select value={form.currency || "BRL"} onChange={(e) => set("currency", e.target.value)} style={{ ...input, fontSize: 13, cursor: "pointer" }}>
              {Object.entries(CURRENCIES).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
            </select></div>
        </div>
      )}

      {tab === "defaults" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Pré-preenchem a Configuração Inicial de cada cliente novo.</p>
          {field("default_vertical", "Nicho padrão", "Ex: Encanadores")}
          {field("default_city", "Cidade padrão", "Ex: São Paulo")}
          <div><label style={label}>Preço padrão</label>
            <select value={form.default_pricing ?? ""} onChange={(e) => set("default_pricing", e.target.value)} style={{ ...input, fontSize: 13, cursor: "pointer" }}>
              <option value="">Sem padrão…</option>
              {PRICING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select></div>
        </div>
      )}

      {tab === "status" && (
        <div>
          <p style={{ color: C.muted, fontSize: 12, margin: "0 0 8px", lineHeight: 1.6 }}>
            As chaves são cadastradas na Vercel (Project → Settings → Environment Variables) e nunca aparecem no navegador.
            Depois de adicionar, faça um <strong>Redeploy</strong>.
          </p>
          {row(status?.auth, "Senha da equipe", "APP_PASSWORD", "protege o app")}
          {row(status?.anthropic, `IA (Claude · ${status?.model ?? "…"})`, "ANTHROPIC_API_KEY", "gera os textos")}
          {row(status?.supabase, "Banco (Supabase)", "SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY", "salva clientes e textos")}
          {row(status?.places, "Google Places", "GOOGLE_PLACES_API_KEY", "busca concorrentes reais")}
        </div>
      )}
    </Shell>
  );
}

// ─── Clientes salvos ─────────────────────────────────────────────────────────

export function ClientsModal({ currentId, onOpen, onClose }: { currentId: string | null; onOpen: (id: string) => void; onClose: () => void }) {
  const [rows, setRows] = useState<ClientRow[] | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const load = () => api<ClientRow[]>("/api/clients").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    try { await api(`/api/clients/${id}`, { method: "DELETE" }); setConfirmDel(null); load(); }
    catch (e) { setErr((e as Error).message); }
  };

  const filtered = (rows ?? []).filter((r) => `${r.name} ${r.vertical} ${r.city}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Shell title="👥 Clientes" subtitle={rows ? `${rows.length} salvo(s)` : "Carregando…"} onClose={onClose} width={680}>
      {err && <p style={{ color: C.red, fontSize: 13 }}>⚠ {err}</p>}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, nicho ou cidade…" style={{ ...input, marginBottom: 14, fontSize: 13 }} />
      {rows && !filtered.length && <p style={{ color: C.dim, fontSize: 13 }}>Nenhum cliente encontrado.</p>}
      {filtered.map((r) => {
        const sections = r.client_phases?.[0]?.count ?? 0;
        return (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 8, borderRadius: 10,
            background: r.id === currentId ? "#0D2137" : C.panel2, border: `1px solid ${r.id === currentId ? C.teal : C.border}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name || "(sem nome)"}</div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {[r.vertical, r.city].filter(Boolean).join(" · ")} · {sections} seção(ões) · {(r.completed_phases ?? []).length}/7 fases ·{" "}
                {new Date(r.updated_at).toLocaleDateString("pt-BR")}
              </div>
            </div>
            {confirmDel === r.id ? (
              <>
                <span style={{ color: C.red, fontSize: 12 }}>Apagar tudo?</span>
                <button type="button" onClick={() => del(r.id)} style={btn("#7C2D12")}>Sim</button>
                <button type="button" onClick={() => setConfirmDel(null)} style={btn(C.border, C.muted)}>Não</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => onOpen(r.id)} disabled={r.id === currentId}
                  style={btn(r.id === currentId ? C.border : primary, r.id === currentId ? C.muted : "#fff")}>{r.id === currentId ? "Aberto" : "Abrir"}</button>
                <button type="button" aria-label="Apagar" onClick={() => setConfirmDel(r.id)} style={btn("#1C0A0A", C.red)}>🗑</button>
              </>
            )}
          </div>
        );
      })}
    </Shell>
  );
}

// ─── Relatório ───────────────────────────────────────────────────────────────

export function ReportModal({ results, formData, agency, onClose, onReset }: {
  results: Record<string, Section>; formData: FormData; agency: Agency; onClose: () => void; onReset: () => void;
}) {
  const [tab, setTab] = useState<"client" | "summary">("client");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState("");
  const [summary, setSummary] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Usa o texto EDITADO de cada seção (antes o relatório ignorava as edições).
  const entries = Object.entries(results).filter(([, s]) => s.content.trim());
  const cur = CURRENCIES[agency.currency || "BRL"];
  const client = formData.clientName || formData.vertical || "cliente";

  const generate = async () => {
    setBusy(true); setErr("");
    const ctx = entries.map(([l, s]) => `## ${l}\n${s.content}`).join("\n\n---\n\n");
    const head = `Cliente: ${client} (${formData.vertical} em ${formData.city}).${formData.clientUrl ? ` Site: ${formData.clientUrl}.` : ""}${agency.name ? ` Agência: ${agency.name}.` : ""}`;
    const rule = "Use apenas as informações dos MATERIAIS. Não invente números; quando estimar, diga que é estimativa.";
    // allSettled: se um falhar, o outro ainda aparece.
    const [rep, sum] = await Promise.allSettled([
      generateText("Você é consultor de marketing digital sênior. Relatórios profissionais, claros, focados em ROI. Português brasileiro.",
        `${head}\n${rule}\n\n# Relatório de SEO Local — ${client}\n\n## Sumário Executivo\n## Situação Atual vs Potencial\n## Oportunidades Identificadas\n## Plano de Ação — 90 dias\n## Resultados Esperados\n## Investimento e Próximos Passos (preços em ${cur})\n\nMATERIAIS:\n${ctx}`, 8000),
      generateText("Você é consultor prático. Guias de execução diretos, checklists acionáveis. Português brasileiro.",
        `${head}\n${rule}\n\n# Guia de Execução (uso interno)\n\n## ✅ Semana 1 — Ações imediatas\n## ✅ Semanas 2-4\n## ✅ Mês 2 e 3\n## 📊 Métricas semanais\n## 🚨 Sinais de alerta\n## 💬 Como reportar ao cliente\n\nMATERIAIS:\n${ctx}`, 8000),
    ]);
    if (rep.status === "fulfilled") setReport(rep.value);
    if (sum.status === "fulfilled") setSummary(sum.value);
    const errs = [rep, sum].filter((r): r is PromiseRejectedResult => r.status === "rejected").map((r) => (r.reason as Error).message);
    if (errs.length) setErr(errs.join(" · "));
    setBusy(false);
  };

  const active = tab === "client" ? report : summary;
  const slug = slugify(`${client}-${formData.city ?? ""}`);

  const downloadAll = () => {
    const header = [
      agency.name && `Agência: ${agency.name}`, agency.consultant && `Consultor: ${agency.consultant}`,
      `Cliente: ${client} | Nicho: ${formData.vertical || "-"} | Cidade: ${formData.city || "-"}`,
      formData.clientUrl && `Site: ${formData.clientUrl}`, `Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,
    ].filter(Boolean).join("\n");
    const bar = "═".repeat(60);
    const block = (t: string, body: string) => `${bar}\n${t.toUpperCase()}\n${bar}\n\n${body}`;
    downloadTxt(`${slug}-completo.txt`, [header, ...entries.map(([l, s]) => block(l, s.content)),
      report && block("Relatório para o cliente", report), summary && block("Guia prático de execução", summary)].filter(Boolean).join("\n\n\n"));
  };

  return (
    <Shell title="📋 Relatório Final" subtitle={`${client} · ${formData.city ?? ""} · ${entries.length} seção(ões)`} onClose={onClose} width={820}>
      {err && <p style={{ color: C.red, fontSize: 13, background: "#1C0A0A", padding: "8px 12px", borderRadius: 6 }}>⚠ {err}</p>}

      {!report && !summary && !busy && (
        <div style={{ textAlign: "center", padding: "28px 12px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <h3 style={{ margin: "0 0 16px", fontSize: 17 }}>Gerar relatório para o cliente + guia de execução</h3>
          {!entries.length && <p style={{ color: C.red, fontSize: 12 }}>⚠ Gere pelo menos 1 seção antes.</p>}
          <button type="button" onClick={generate} disabled={!entries.length}
            style={btn(entries.length ? primary : C.border, entries.length ? "#fff" : C.dim, { padding: "14px 32px", fontSize: 14, borderRadius: 10 })}>✦ Gerar com IA</button>
        </div>
      )}

      {busy && (
        <div style={{ textAlign: "center", padding: "56px 20px" }}>
          <div className="spin" style={{ fontSize: 32, marginBottom: 16 }}>⟳</div>
          <p style={{ color: C.blue, margin: 0 }}>Compilando relatório e guia… (até 2 minutos)</p>
        </div>
      )}

      {(report || summary) && !busy && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {([["client", "📊 Para o cliente"], ["summary", "⚡ Guia prático (você)"]] as const).map(([t, l]) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                style={btn(tab === t ? (t === "client" ? C.teal : "#7C3AED") : C.panel2, tab === t ? "#fff" : C.dim, { fontSize: 13 })}>{l}</button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button type="button" disabled={!active} onClick={async () => { if (await copyText(active)) { setCopied(true); setTimeout(() => setCopied(false), 2000); } }}
                style={btn("#0D2137", copied ? "#6EE7B7" : C.blue)}>{copied ? "✓ Copiado" : "Copiar"}</button>
              <button type="button" disabled={!active} onClick={() => downloadTxt(`${slug}-${tab === "client" ? "relatorio-cliente" : "guia-execucao"}.txt`, active)}
                style={btn("#0D2137", C.blue)}>⬇ .txt</button>
            </div>
          </div>
          <div style={{ color: C.body, fontSize: 13, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{active || "Esta parte falhou — use Regenerar."}</div>

          <div style={{ marginTop: 28, padding: 18, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={downloadAll} style={btn(primary, "#fff", { padding: "12px 20px", fontSize: 13 })}>⬇ Baixar tudo (.txt)</button>
            <button type="button" onClick={generate} style={btn("transparent", C.muted, { border: `1px solid ${C.faint}`, padding: "12px 20px", fontSize: 13 })}>↺ Regenerar</button>
            {!confirmReset ? (
              <button type="button" onClick={() => setConfirmReset(true)} style={btn("#1C0A0A", C.red, { marginLeft: "auto", border: "1px solid #7C2D12", padding: "12px 20px", fontSize: 13 })}>🔄 Novo cliente</button>
            ) : (
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: C.red, fontSize: 12 }}>Começar outro cliente?</span>
                <button type="button" onClick={() => { onReset(); onClose(); }} style={btn("#7C2D12")}>Sim</button>
                <button type="button" onClick={() => setConfirmReset(false)} style={btn(C.border, C.muted)}>Não</button>
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}
