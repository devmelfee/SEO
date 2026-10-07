import { NextResponse } from "next/server";
import { authConfigured } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { MODEL } from "@/lib/claude";

export const dynamic = "force-dynamic";

/** Só diz QUAIS credenciais existem — nunca os valores. */
export async function GET() {
  return NextResponse.json({
    data: {
      auth: authConfigured(),
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      supabase: supabaseConfigured(),
      places: !!process.env.GOOGLE_PLACES_API_KEY,
      model: MODEL,
    },
  });
}
