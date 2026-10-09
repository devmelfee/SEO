import { z } from "zod";
import { db } from "@/lib/supabase";
import { check, fail, handle, ok } from "@/lib/http";
import { isValidCnpj, onlyDigits } from "@/lib/contact";
import { checkLink, CnpjError, fetchCnpj } from "@/lib/verify";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({ cnpj: z.string().trim().max(30).optional() });

/**
 * Verifica o contato de um lead: abre o site/rede social cadastrado e, se houver CNPJ,
 * consulta a Receita (situação, telefones, e-mail e quadro de sócios para achar o decisor).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = z.string().uuid().parse(params.id);
    const { cnpj: raw } = Body.parse(await req.json().catch(() => ({})));
    const lead = check(await db().from("prospects").select("id,website,cnpj,company_data,link_check").eq("id", id).maybeSingle()) as
      { id: string; website: string; cnpj: string | null; company_data: unknown; link_check: Record<string, unknown> | null } | null;
    if (!lead) return fail(404, "Lead não encontrado.");

    const patch: Record<string, unknown> = { contact_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const cnpj = raw !== undefined ? onlyDigits(raw) : lead.cnpj;
    if (raw !== undefined && raw !== "" && !isValidCnpj(raw)) return fail(400, "CNPJ inválido: confira os 14 números.");

    const [link, company] = await Promise.all([
      lead.website ? checkLink(lead.website) : Promise.resolve(null),
      cnpj ? fetchCnpj(cnpj).catch((e) => (e instanceof CnpjError ? e : Promise.reject(e))) : Promise.resolve(null),
    ]);
    patch.link_check = { ...(lead.link_check ?? {}), website: link };
    if (raw !== undefined) patch.cnpj = cnpj || null;
    if (company instanceof CnpjError) {
      const row = check(await db().from("prospects").update(patch).eq("id", id).select("*").single());
      return ok({ ...row, _warning: company.message });
    }
    if (company) patch.company_data = company;
    return ok(check(await db().from("prospects").update(patch).eq("id", id).select("*").single()));
  } catch (e) { return handle(e); }
}
