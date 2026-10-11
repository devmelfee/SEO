"use client";
import { useState } from "react";
import { Icon } from "./Icon";

type Mod = { t: string; d: string; img: string; alt: string; pts: string[] };
type Group = { id: string; label: string; who: string; mods: Mod[] };

// Os módulos do sistema, agrupados por quem usa. Cada um com o print de verdade (dados de exemplo).
const GROUPS: Group[] = [
  { id: "vende", label: "Quem vende", who: "Abre o app e vê quem chamar hoje, com a mensagem escrita.", mods: [
    { t: "Buscar", d: "Nicho e cidade. Cada empresa do Google Maps volta com uma nota de 0 a 100 e o motivo.", img: "tela-buscar.webp", alt: "Lista de empresas com nota de oportunidade",
      pts: ["Nota alta = está perdendo cliente agora", "Sem site, poucas avaliações, perfil pela metade", "Buscas favoritas para repetir com um toque"] },
    { t: "Validar contato", d: "Antes de chamar: a empresa está aberta, o link funciona e quem decide.", img: "tela-validar.webp", alt: "Validação do contato com CNPJ e decisor",
      pts: ["CNPJ na Receita: situação e quadro de sócios", "Decisor salvo; o WhatsApp vai direto para ele", "Número inválido sai da fila sozinho"] },
    { t: "Abordagem", d: "Fila do dia com a mensagem que cita o problema daquela empresa, e os lembretes do 2º e do 5º dia.", img: "tela-abordagem.webp", alt: "Fila de abordagem com a mensagem pronta",
      pts: ["Envio um por um, no ritmo de uma pessoa", "Lembrete traz um argumento novo", "Última mensagem oferece parar o contato"] },
  ] },
  { id: "decide", label: "Quem decide", who: "Escolhe onde prospectar e controla quanto cada busca custa.", mods: [
    { t: "Onde prospectar", d: "Compara cidades vizinhas no mesmo nicho antes de gastar tempo: quem tem mais empresas sem site e concorrência mais fraca.", img: "tela-onde-prospectar.webp", alt: "Ranking de cidades por oportunidade",
      pts: ["Índice de oportunidade por cidade", "Gráfico de onde atacar primeiro", "Leva as cidades escolhidas para um projeto"] },
    { t: "Gastos e limites", d: "Cada consulta ao Google e cada texto de IA fica registrado por pessoa, com o custo em reais.", img: "tela-gastos.webp", alt: "Painel de gastos por pessoa",
      pts: ["Limite por pessoa, por janela de horas e por semana", "Escolha do modelo de IA pelo custo", "Pedido de mais buscas pelo WhatsApp"] },
  ] },
  { id: "entrega", label: "Quem entrega", who: "Depois do sim, o trabalho sai pronto e é aplicado no Google.", mods: [
    { t: "Site em 3 origens", d: "Modelo pronto na hora, gerado por IA ou o link do site que você faz em outra ferramenta. O link certo vai para a proposta e para a mensagem.", img: "tela-site.webp", alt: "Site de prévia com três origens",
      pts: ["O dono vê o site antes de pagar", "Visitas ao link contadas", "Seu site de outro app entra no perfil do Google"] },
    { t: "Proposta com aceite", d: "Com o nome da empresa, os problemas encontrados, a comparação com os concorrentes e a garantia. O cliente aceita por um link.", img: "tela-proposta.webp", alt: "Editor da proposta com o nome da empresa",
      pts: ["Validade real de 7 dias", "Aceite marca o cliente como fechado", "Abre o seu WhatsApp para combinar o início"] },
    { t: "Perfil do Google com um clique", d: "Descrição, serviços, site, posts agendados e respostas às avaliações aplicados no Perfil da Empresa pela API, com o valor anterior guardado.", img: "tela-fila-google.webp", alt: "Fila de ações do Perfil do Google",
      pts: ["Posts publicados nas datas certas", "Respostas a avaliações com revisão", "Sem a API, copia e abre o Google no lugar certo"] },
    { t: "Relatório do mês", d: "Visualizações, ligações, rotas e cliques no site contra o mês anterior, com o que foi feito, pronto para mandar no WhatsApp do cliente.", img: "tela-relatorio.webp", alt: "Relatório mensal com métricas do Google",
      pts: ["Números do próprio Google", "O que foi feito no perfil, listado", "Um toque para enviar ao cliente"] },
  ] },
];

/** Tour do sistema por perfil de quem usa. */
export function SystemTour() {
  const [g, setG] = useState(0);
  const [m, setM] = useState(0);
  const group = GROUPS[g], mod = group.mods[Math.min(m, group.mods.length - 1)];
  return (
    <div className="lp-tour">
      <div className="lp-seg" role="tablist" aria-label="Perfis">
        {GROUPS.map((x, k) => <button key={x.id} role="tab" aria-selected={g === k} onClick={() => { setG(k); setM(0); }}>{x.label}</button>)}
      </div>
      <p className="lp-tour-who">{group.who}</p>
      <div className="lp-tour-body">
        <ul className="lp-tour-list" role="tablist" aria-label={`Módulos para ${group.label.toLowerCase()}`}>
          {group.mods.map((x, k) => (
            <li key={x.t}>
              <button role="tab" aria-selected={k === m} onClick={() => setM(k)}>
                <strong>{x.t}</strong><span>{x.d}</span>
              </button>
              {k === m && <ul className="lp-tour-pts">{x.pts.map((p) => <li key={p}><Icon name="check" size={16} />{p}</li>)}</ul>}
            </li>
          ))}
        </ul>
        <figure className="lp-phone lp-tour-phone" key={mod.img}>
          <img src={`/apresentacao/${mod.img}`} alt={mod.alt} width={390} height={844} />
          <figcaption>Tela real do sistema, com dados de exemplo</figcaption>
        </figure>
      </div>
    </div>
  );
}
