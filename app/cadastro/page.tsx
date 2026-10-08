import { AuthForm } from "@/components/AuthForm";
import { publicAuthConfig } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function Page({ searchParams }: { searchParams: { next?: string; erro?: string } }) {
  const { url, anonKey } = publicAuthConfig();
  const next = searchParams.next?.startsWith("/") ? searchParams.next : "/";
  return <AuthForm mode="cadastro" url={url} anonKey={anonKey} next={next} initialError={searchParams.erro ?? ""} />;
}
