import { db, supabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// A página é gerada por IA/colada: servida ISOLADA. O sandbox dá a ela uma origem opaca (não lê cookies
// nem chama a API do app) e script-src 'none' bloqueia qualquer JavaScript. Links e o mapa continuam funcionando.
const CSP = [
  "sandbox allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation",
  "default-src 'none'", "script-src 'none'", "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com", "img-src https: data:", "frame-src https://www.google.com https://maps.google.com",
  "form-action 'none'", "base-uri 'none'",
].join("; ");

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const notFound = () => new Response("Página não encontrada.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  if (!supabaseConfigured() || !/^[a-z0-9-]{1,80}$/.test(params.slug)) return notFound();
  const { data } = await db().from("sites").select("id,html,views,source,external_url").eq("slug", params.slug).maybeSingle();
  if (!data) return notFound();
  // Contador simples de visitas (para saber se o prospect abriu o link).
  db().from("sites").update({ views: (data.views ?? 0) + 1 }).eq("id", data.id).then(() => {}, () => {});
  // Site feito em outro app: o link /s/… continua valendo e leva ao endereço real.
  if (data.source === "externo" && data.external_url) return Response.redirect(data.external_url, 302);
  if (!data.html) return notFound();
  return new Response(data.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CSP,
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
    },
  });
}
