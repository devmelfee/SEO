import { z } from "zod";
import { db, supabaseConfigured } from "@/lib/supabase";
import { fail, handle, ok } from "@/lib/http";
import { formatPlaces, type Place } from "@/lib/places";

export const dynamic = "force-dynamic";

const Body = z.object({
  query: z.string().trim().min(3).max(200),
  clientId: z.string().uuid().nullish(),
});

const FIELDS = [
  "places.displayName", "places.formattedAddress", "places.rating", "places.userRatingCount",
  "places.primaryTypeDisplayName", "places.types", "places.websiteUri", "places.nationalPhoneNumber",
  "places.regularOpeningHours.weekdayDescriptions",
].join(",");

/** Proxy da Google Places API (New) — Text Search. A chave fica só no servidor. */
export async function POST(req: Request) {
  try {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) return fail(503, "GOOGLE_PLACES_API_KEY não configurada. Você pode colar os dados dos concorrentes à mão.");
    const { query, clientId } = Body.parse(await req.json());

    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS },
      body: JSON.stringify({ textQuery: query, languageCode: "pt-BR", pageSize: 10 }),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const hint = res.status === 403
        ? " — No Google Cloud, na chave: Restrições de aplicativo = Nenhuma (não use 'Sites') e inclua 'Places API (New)' nas APIs permitidas."
        : res.status === 429 ? " — Cota do Google esgotada; tente mais tarde." : "";
      return fail(502, `Google Places respondeu ${res.status}: ${json?.error?.message ?? "erro"}${hint}`);
    }

    const places: Place[] = json.places ?? [];
    const text = formatPlaces(places);

    if (supabaseConfigured()) {
      // Histórico de buscas; falha aqui não impede o uso do resultado.
      const { error } = await db().from("places_searches").insert({ client_id: clientId ?? null, query, results: places });
      if (error) console.error("places_searches:", error.message);
    }
    return ok({ count: places.length, text });
  } catch (e) { return handle(e); }
}
