import "server-only";

/** Chamada à Places API (New) — Text Search. Erros viram mensagens com o motivo do Google. */
export async function searchText(body: Record<string, unknown>, fieldMask: string): Promise<any> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new GoogleError(503, "GOOGLE_PLACES_API_KEY não configurada.");
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": fieldMask },
    body: JSON.stringify({ languageCode: "pt-BR", regionCode: "BR", ...body }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details: { reason?: string }[] = json?.error?.details ?? [];
    const info = [json?.error?.status, ...details.map((d) => d.reason)].filter(Boolean).join(" · ");
    const hint = /billing/i.test(json?.error?.message ?? "") || info.includes("BILLING")
      ? " — Ative o faturamento do projeto no Google Cloud."
      : res.status === 403 ? " — Confira faturamento ativo e se a 'Places API (New)' está ativada no projeto da chave." : "";
    console.error("Google Places erro:", res.status, JSON.stringify(json?.error ?? json).slice(0, 2000));
    throw new GoogleError(502, `Google Places respondeu ${res.status}: ${json?.error?.message ?? "erro"}${info ? ` [${info}]` : ""}${hint}`);
  }
  return json;
}

export class GoogleError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
