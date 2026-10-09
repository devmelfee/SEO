import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = { title: "API — documentação", robots: { index: false, follow: false } };

const FIELDS: [string, string][] = [
  ["id", "Identificador do lead (UUID)"], ["name", "Nome da empresa"], ["phone", "Telefone como está no Google"],
  ["whatsapp", "Celular no formato +55DDDNÚMERO, ou null se for fixo"], ["website", "Site atual (ou rede social)"],
  ["has_own_site", "true se tem site próprio (rede social não conta)"], ["address", "Endereço"], ["niche / city", "Nicho e cidade da busca"],
  ["search_query", "Texto da busca que trouxe o lead"], ["google_maps_url", "Link do perfil no Google Maps"],
  ["rating / reviews_count", "Nota e número de avaliações no Google"], ["opportunity_score", "Nota de oportunidade (0–100): quanto maior, mais fácil vender"],
  ["issues[]", "Problemas encontrados: code, label, detail"], ["status", "novo, abordado, respondeu, proposta, fechado, descartado"],
  ["contact_step / next_followup_at", "Etapa da abordagem no WhatsApp e próximo lembrete"], ["site_preview_url", "Link do site de prévia, se foi criado"],
  ["contact_status", "nao_verificado, confirmado, invalido ou sem_whatsapp"], ["cnpj / company", "CNPJ e situação na Receita (razão social, ATIVA/BAIXADA), se consultado"],
  ["decision_maker", "Tomador de decisão identificado: nome, cargo e origem (receita, conversa, manual)"],
  ["opening_hours / location", "Horários e coordenadas"], ["updated_at", "Última mudança (use para sincronizar)"],
];

const PARAMS: [string, string][] = [
  ["query", "Só uma busca. Ex: Pet shop em Jundiaí"], ["project_id", "Só um projeto"], ["status", "Um ou vários, separados por vírgula. Ex: novo,abordado"],
  ["min_score", "Nota de oportunidade mínima (0–100)"], ["has_own_site", "true ou false"], ["updated_since", "Só o que mudou depois desta data (ISO 8601)"],
  ["limit", "1 a 500 (padrão 100)"], ["cursor", "Valor de meta.next_cursor para a próxima página"], ["format", "csv para baixar planilha (até 5.000 linhas)"],
];

export default function ApiDocs() {
  const h = headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "seu-app.vercel.app"}`;
  const base = `${origin}/api/v1`;
  const code = { background: "#0f172a", color: "#e2e8f0", borderRadius: 10, padding: 14, fontSize: 13, overflowX: "auto" as const, lineHeight: 1.55, margin: "8px 0 18px" };
  const th = { textAlign: "left" as const, padding: "8px 10px", borderBottom: "1px solid #e2e8f0", fontSize: 13, color: "#64748b" };
  const td = { padding: "8px 10px", borderBottom: "1px solid #f1f5f9", fontSize: 14, verticalAlign: "top" as const };
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 18px 64px", lineHeight: 1.6, color: "#0f172a", background: "#fff" }}>
      <p style={{ color: "#0f766e", fontWeight: 600, margin: 0 }}>API pública · v1</p>
      <h1 style={{ margin: "4px 0 8px", fontSize: 30 }}>Puxe os leads das buscas para o seu CRM, planilha ou site</h1>
      <p style={{ color: "#475569", marginTop: 0 }}>Respostas em JSON (<code>{"{ data, meta }"}</code>), datas em ISO 8601 (UTC), nomes de campo em inglês e estáveis — campos novos podem aparecer, os existentes não mudam.</p>

      <h2>1. Crie uma chave</h2>
      <p>No app: <strong>Ajustes › API › Criar chave</strong> (só administradores). A chave aparece uma vez; guarde num lugar seguro. Use uma chave por integração.</p>
      <p><strong>Envie sempre no cabeçalho</strong>, nunca na URL, e nunca dentro do código de um site (qualquer visitante veria). Chame a API pelo seu servidor, CRM ou automação.</p>
      <pre style={code}>{`Authorization: Bearer seo_SUA_CHAVE`}</pre>

      <h2>2. Liste os leads</h2>
      <pre style={code}>{`curl -H "Authorization: Bearer seo_SUA_CHAVE" \\
  "${base}/leads?status=novo&min_score=60&has_own_site=false&limit=50"`}</pre>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
        <thead><tr><th style={th}>Parâmetro</th><th style={th}>O que faz</th></tr></thead>
        <tbody>{PARAMS.map(([k, v]) => <tr key={k}><td style={td}><code>{k}</code></td><td style={td}>{v}</td></tr>)}</tbody>
      </table>
      <p>Resposta:</p>
      <pre style={code}>{`{
  "data": [{
    "id": "8e37b1a8-…", "name": "Pet Feliz", "whatsapp": "+5511988887777",
    "has_own_site": false, "niche": "Pet shop", "city": "Jundiaí",
    "rating": 4.2, "reviews_count": 8, "opportunity_score": 72,
    "issues": [{ "code": "no_website", "label": "Sem site", "detail": "…" }],
    "status": "novo", "site_preview_url": null, "updated_at": "2026-10-08T12:00:00Z", …
  }],
  "meta": { "count": 50, "has_more": true, "next_cursor": "eyJvIjo1MH0" }
}`}</pre>

      <h3>Sincronizar sem duplicar</h3>
      <p>Guarde o maior <code>updated_at</code> que recebeu e, na próxima vez, peça só o que mudou: <code>?updated_since=2026-10-08T12:00:00Z</code>. Use o <code>id</code> como chave única no seu CRM.</p>

      <h3>Planilha (CSV)</h3>
      <pre style={code}>{`curl -H "Authorization: Bearer seo_SUA_CHAVE" -o leads.csv "${base}/leads?format=csv&min_score=50"`}</pre>

      <h2>3. Outras rotas</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
        <thead><tr><th style={th}>Rota</th><th style={th}>Permissão</th><th style={th}>O que faz</th></tr></thead>
        <tbody>
          <tr><td style={td}><code>GET /leads/{"{id}"}</code></td><td style={td}>leitura</td><td style={td}>Um lead</td></tr>
          <tr><td style={td}><code>PATCH /leads/{"{id}"}</code></td><td style={td}>escrita</td><td style={td}>Atualiza <code>status</code>, <code>notes</code> ou <code>project_id</code> — para o CRM devolver o andamento</td></tr>
          <tr><td style={td}><code>GET /searches</code></td><td style={td}>leitura</td><td style={td}>Buscas feitas, com total, quentes e sem site</td></tr>
          <tr><td style={td}><code>GET /projects</code></td><td style={td}>leitura</td><td style={td}>Projetos com leads por status</td></tr>
        </tbody>
      </table>
      <pre style={code}>{`curl -X PATCH -H "Authorization: Bearer seo_SUA_CHAVE" -H "Content-Type: application/json" \\
  -d '{"status":"fechado","notes":"Fechou no CRM em 08/10"}' "${base}/leads/ID_DO_LEAD"`}</pre>

      <h2>Exemplo em JavaScript (servidor)</h2>
      <pre style={code}>{`const res = await fetch("${base}/leads?status=novo&limit=100", {
  headers: { Authorization: \`Bearer \${process.env.SEO_API_KEY}\` },
});
const { data, meta } = await res.json();`}</pre>

      <h2>Campos do lead</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
        <tbody>{FIELDS.map(([k, v]) => <tr key={k}><td style={td}><code>{k}</code></td><td style={td}>{v}</td></tr>)}</tbody>
      </table>

      <h2>Erros e limites</h2>
      <pre style={code}>{`{ "error": { "code": "unauthorized", "message": "Chave inválida ou revogada." } }`}</pre>
      <p><code>400 invalid_params</code> · <code>401 unauthorized</code> · <code>403 forbidden</code> (chave só de leitura tentando escrever) · <code>404 not_found</code> · <code>429 rate_limited</code> (120 pedidos por minuto por chave; respeite o cabeçalho <code>Retry-After</code>).</p>
      <p style={{ color: "#64748b", fontSize: 14 }}>Índice da API: <a href={base}>{base}</a></p>
    </main>
  );
}
