import { z } from "zod";
import { db, supabaseConfigured } from "@/lib/supabase";
import { check, fail, handle, ok } from "@/lib/http";
import { searchText, GoogleError } from "@/lib/google";
import { scoreOpportunity, type PlaceData } from "@/lib/opportunity";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  query: z.string().trim().min(3).max(200),
  max: z.union([z.literal(20), z.literal(40), z.literal(60)]).default(20),
});

const FIELDS = [
  "places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber", "places.websiteUri",
  "places.googleMapsUri", "places.rating", "places.userRatingCount", "places.primaryType", "places.types",
  "places.regularOpeningHours.weekdayDescriptions", "places.photos.name", "places.businessStatus", "places.location",
  "nextPageToken",
].join(",");

/** Busca até 60 estabelecimentos, dá a nota de oportunidade e grava como leads (sem apagar status/notas existentes). */
export async function POST(req: Request) {
  try {
    const { query, max } = Body.parse(await req.json());
    const places: any[] = [];
    let pageToken: string | undefined;
    do {
      const json = await searchText({ textQuery: query, pageSize: 20, ...(pageToken ? { pageToken } : {}) }, FIELDS);
      places.push(...(json.places ?? []));
      pageToken = json.nextPageToken;
    } while (pageToken && places.length < max);

    const leaderReviews = Math.max(0, ...places.slice(0, 3).map((p) => p.userRatingCount ?? 0));
    const rows = places.slice(0, max).map((p, i) => {
      const data: PlaceData = {
        id: p.id, name: p.displayName?.text ?? "", website: p.websiteUri, phone: p.nationalPhoneNumber,
        rating: p.rating, reviews: p.userRatingCount ?? 0, hasHours: !!p.regularOpeningHours?.weekdayDescriptions?.length,
        photos: p.photos?.length ?? 0, types: p.types ?? [], status: p.businessStatus,
      };
      const { score, issues } = scoreOpportunity(data, { rank: i + 1, leaderReviews, total: places.length });
      return {
        place_id: p.id, query, name: data.name, address: p.formattedAddress ?? "", phone: data.phone ?? "",
        website: data.website ?? "", maps_url: p.googleMapsUri ?? "", rating: p.rating ?? null, reviews_count: data.reviews,
        primary_type: p.primaryType ?? "", types: data.types, has_hours: data.hasHours, photos_count: data.photos,
        business_status: p.businessStatus ?? "", lat: p.location?.latitude ?? null, lng: p.location?.longitude ?? null,
        rank_in_search: i + 1, score, issues, updated_at: new Date().toISOString(),
      };
    });

    if (!supabaseConfigured()) return ok({ saved: false, prospects: rows.sort((a, b) => b.score - a.score) });
    // status, notes e client_id ficam de fora: re-buscar não apaga o andamento do funil.
    const saved = check(await db().from("prospects").upsert(rows, { onConflict: "place_id" }).select("*"));
    return ok({ saved: true, prospects: (saved as any[]).sort((a, b) => b.score - a.score) });
  } catch (e) {
    if (e instanceof GoogleError) return fail(e.status, e.message);
    return handle(e);
  }
}
