import "server-only";
import { db, supabaseConfigured } from "@/lib/supabase";
import { whatsappNumber } from "@/lib/site";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export type Agency = { name: string; brand: string; consultant: string; wa: string | null };

/** Nome e WhatsApp da agência (Ajustes). As landings são da marca de quem usa o app. */
export async function agency(): Promise<Agency> {
  let name = "", consultant = "", whatsapp = "";
  if (supabaseConfigured()) {
    try {
      const { data } = await db().from("agency_settings").select("name,consultant,whatsapp").eq("id", SETTINGS_ID).maybeSingle();
      name = data?.name ?? ""; consultant = data?.consultant ?? ""; whatsapp = data?.whatsapp ?? "";
    } catch { /* página pública: sem banco, segue com o padrão */ }
  }
  return { name, brand: name || "SEO Local", consultant, wa: whatsappNumber(whatsapp) };
}

/** Link de WhatsApp com a mensagem pronta, ou null quando a agência não cadastrou celular. */
export const waHref = (wa: string | null, text: string) => (wa ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}` : null);
