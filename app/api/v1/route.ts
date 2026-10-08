import { reply } from "@/lib/apiv1";

export const dynamic = "force-dynamic";

/** Índice da API: o que existe e onde está a documentação. Não exige chave. */
export async function GET(req: Request) {
  const base = `${new URL(req.url).origin}/api/v1`;
  return reply({
    data: {
      name: "SEO Local — API pública", version: "v1", docs: `${new URL(req.url).origin}/api-docs`,
      auth: "Authorization: Bearer seo_... (crie em Ajustes › API)",
      endpoints: [
        { method: "GET", path: `${base}/leads`, scope: "read", about: "Empresas encontradas nas buscas, com filtros e paginação (ou ?format=csv)" },
        { method: "GET", path: `${base}/leads/{id}`, scope: "read", about: "Uma empresa" },
        { method: "PATCH", path: `${base}/leads/{id}`, scope: "write", about: "Atualiza status, anotações ou projeto (sincronizar do seu CRM)" },
        { method: "GET", path: `${base}/searches`, scope: "read", about: "Buscas feitas, com totais por busca" },
        { method: "GET", path: `${base}/projects`, scope: "read", about: "Projetos e funil" },
      ],
    },
  });
}
