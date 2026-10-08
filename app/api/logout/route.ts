import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authClient } from "@/lib/auth";

export async function POST() {
  const store = cookies();
  const res = NextResponse.json({ data: { ok: true } });
  const supabase = authClient({
    getAll: () => store.getAll(),
    setAll: (list) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
  });
  await supabase.auth.signOut();
  return res;
}
