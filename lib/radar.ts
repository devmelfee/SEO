import "server-only";
import { db, supabaseConfigured } from "./supabase";
import { check } from "./http";
import { searchText } from "./google";
import { scoreOpportunity, type PlaceData } from "./opportunity";

const FIELDS = [
  "places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber", "places.websiteUri",
  "places.googleMapsUri", "places.rating", "places.userRatingCount", "places.primaryType", "places.types",
  "places.regularOpeningHours.weekdayDescriptions", "places.photos.name", "places.businessStatus", "places.location",
  "nextPageToken",
].join(",");

/** Busca até `max` estabelecimentos, dá a nota de oportunidade e grava como leads (sem apagar status/notas). */
export async function runRadarSearch(query: string, max: number) {
  const places: any[] = [];
  let pageToken: string | undefined;
  let requests = 0;
  do {
    const json = await searchText({ textQuery: query, pageSize: 20, ...(pageToken ? { pageToken } : {}) }, FIELDS);
    requests++;
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
      hours: p.regularOpeningHours?.weekdayDescriptions ?? [],
      rank_in_search: i + 1, score, issues, updated_at: new Date().toISOString(),
    };
  });

  if (!supabaseConfigured() || !rows.length) return { saved: false, requests, prospects: rows.sort((a, b) => b.score - a.score) };
  const saved = check(await db().from("prospects").upsert(rows, { onConflict: "place_id" }).select("*")) as any[];
  return { saved: true, requests, prospects: saved.sort((a, b) => b.score - a.score) };
}
