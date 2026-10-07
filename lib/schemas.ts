import { z } from "zod";

const s = (max: number) => z.string().trim().max(max).optional().default("");

export const ClientInput = z.object({
  clientName: s(200),
  clientUrl: s(500),
  vertical: s(200),
  city: s(200),
  pricing: s(200),
  goal: s(200),
  realData: s(20000),
  completedPhases: z.array(z.number().int().min(0).max(50)).max(50).optional().default([]),
});

export const toRow = (c: z.infer<typeof ClientInput>) => ({
  name: c.clientName, url: c.clientUrl, vertical: c.vertical, city: c.city,
  pricing: c.pricing, goal: c.goal, real_data: c.realData, completed_phases: c.completedPhases,
});

export const CLIENT_COLS = "id,name,url,vertical,city,pricing,goal,real_data,completed_phases,created_at,updated_at";
