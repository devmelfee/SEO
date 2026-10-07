import { z } from "zod";
import { db } from "@/lib/supabase";
import { check, handle, ok } from "@/lib/http";

export const dynamic = "force-dynamic";
const ROW_ID = "00000000-0000-0000-0000-000000000001";

// Só campos de agência. Credenciais NUNCA passam por aqui (ficam em variáveis de ambiente).
const Settings = z.object({
  name: z.string().max(200).optional().default(""),
  consultant: z.string().max(200).optional().default(""),
  email: z.string().max(200).optional().default(""),
  whatsapp: z.string().max(50).optional().default(""),
  currency: z.enum(["BRL", "USD", "EUR", "GBP"]).optional().default("BRL"),
  default_vertical: z.string().max(200).optional().default(""),
  default_city: z.string().max(200).optional().default(""),
  default_pricing: z.string().max(200).optional().default(""),
});
const COLS = "name,consultant,email,whatsapp,currency,default_vertical,default_city,default_pricing";

export async function GET() {
  try {
    const row = check(await db().from("agency_settings").select(COLS).eq("id", ROW_ID).maybeSingle());
    return ok(row ?? {});
  } catch (e) { return handle(e); }
}

export async function PUT(req: Request) {
  try {
    const data = Settings.parse(await req.json());
    const row = check(await db().from("agency_settings")
      .upsert({ id: ROW_ID, ...data, updated_at: new Date().toISOString() })
      .select(COLS).single());
    return ok(row);
  } catch (e) { return handle(e); }
}
