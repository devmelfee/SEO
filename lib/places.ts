// Formata resultados da Google Places API (New) em texto para o {realData} dos prompts. Função pura.

export type Place = {
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  websiteUri?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
};

export function formatPlaces(places: Place[], limit = 5): string {
  return places
    .slice(0, limit)
    .map((p, i) => {
      const lines = [
        `${i + 1}. ${p.displayName?.text ?? "Sem nome"}`,
        p.primaryTypeDisplayName?.text && `   Categoria principal: ${p.primaryTypeDisplayName.text}`,
        p.types?.length && `   Tipos: ${p.types.filter((t) => !["point_of_interest", "establishment"].includes(t)).join(", ")}`,
        `   Avaliações: ${p.userRatingCount ?? 0} · Nota: ${p.rating ?? "sem nota"}`,
        p.formattedAddress && `   Endereço: ${p.formattedAddress}`,
        p.websiteUri && `   Site: ${p.websiteUri}`,
        p.nationalPhoneNumber && `   Telefone: ${p.nationalPhoneNumber}`,
        p.regularOpeningHours?.weekdayDescriptions?.length && `   Horário: ${p.regularOpeningHours.weekdayDescriptions.join("; ")}`,
      ];
      return lines.filter(Boolean).join("\n");
    })
    .join("\n\n");
}
