import { db, supabaseConfigured } from "@/lib/supabase";
import { acceptLink, buildProposalHtml, type ProposalData } from "@/lib/proposal";

export const dynamic = "force-dynamic";

// Sem JavaScript; o único formulário é o "Aceitar", que volta para esta mesma rota.
const CSP = [
  "default-src 'none'", "script-src 'none'", "style-src 'unsafe-inline'", "img-src https: data:",
  "form-action 'self' https://wa.me https://api.whatsapp.com", "base-uri 'none'", "frame-ancestors 'self'",
].join("; ");
const HEADERS = {
  "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": CSP, "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store",
};
const notFound = () => new Response("Proposta não encontrada.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });

type Row = { id: string; client_id: string; data: ProposalData; status: string; views: number; accepted_at: string | null };
async function load(slug: string): Promise<Row | null> {
  if (!supabaseConfigured() || !/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const { data } = await db().from("proposals").select("id,client_id,data,status,views,accepted_at").eq("slug", slug).maybeSingle();
  return data as Row | null;
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const p = await load(params.slug);
  if (!p) return notFound();
  // Visitas: abrir pelo app (pré-visualização do consultor, ?preview=1) não conta.
  if (!new URL(req.url).searchParams.has("preview")) db().from("proposals").update({ views: (p.views ?? 0) + 1 }).eq("id", p.id).then(() => {}, () => {});
  return new Response(buildProposalHtml(p.data, { accepted: p.status === "aceita", acceptedAt: p.accepted_at }), { headers: HEADERS });
}

/** O cliente clicou em "Aceitar": registra, fecha o lead e abre o WhatsApp da agência. */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const p = await load(params.slug);
  if (!p) return notFound();
  if (p.status !== "aceita") {
    const now = new Date().toISOString();
    await db().from("proposals").update({ status: "aceita", accepted_at: now, updated_at: now }).eq("id", p.id);
    await db().from("prospects").update({ status: "fechado", next_followup_at: null, updated_at: now }).eq("client_id", p.client_id);
  }
  const to = acceptLink(p.data) ?? new URL(`/p/${params.slug}`, req.url).toString();
  return new Response(null, { status: 303, headers: { Location: to } });
}
