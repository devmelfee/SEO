"use client";
import { useMemo, useState } from "react";
import { brl, monthlyLoss, QUIZ, quizScore, type QuizAnswers } from "@/lib/landing";
import { Icon } from "./Icon";

type Who = { empresa: string; nicho: string; cidade: string };

const FAIXA = {
  critica: { t: "Seu perfil está deixando muitos clientes passarem", d: "Quem procura o seu serviço encontra os concorrentes antes de você." },
  fraca: { t: "Dá para ganhar muito mais clientes do mesmo perfil", d: "A base existe; faltam os pontos que mais pesam na escolha do cliente." },
  boa: { t: "Seu perfil está bem cuidado", d: "Vale conferir os detalhes e acompanhar os números todo mês." },
} as const;

/** Autodiagnóstico: 8 perguntas de sim ou não, nota de 0 a 100 e o que falta, na ordem do que mais custa. */
export function OwnerQuiz({ who, waBase }: { who: Who; waBase: string | null }) {
  const [a, setA] = useState<QuizAnswers>({});
  const r = useMemo(() => quizScore(a), [a]);
  const done = r.respondidas === QUIZ.length;
  const nome = who.empresa || "minha empresa";
  const text = `Olá! Fiz o autodiagnóstico do Google: ${nome} tirou ${r.nota}/100${who.cidade ? ` em ${who.cidade}` : ""}. Quero o diagnóstico completo grátis.${r.faltas.length ? `\nO que falta: ${r.faltas.slice(0, 3).join("; ")}.` : ""}`;
  const href = waBase ? `https://wa.me/${waBase}?text=${encodeURIComponent(text)}` : null;
  const R = 34, L = 2 * Math.PI * R;

  return (
    <div className="lp-quiz" role="group" aria-label="Autodiagnóstico do perfil no Google">
      <div className="lp-quiz-head"><strong>Autodiagnóstico do seu perfil</strong><span className="lp-quiz-prog">{r.respondidas} de {QUIZ.length}</span></div>
      <ol>
        {QUIZ.map((q) => (
          <li key={q.id}>
            <p>{q.q}</p>
            <span className="lp-yn" role="group" aria-label={q.q}>
              <button type="button" data-v="sim" aria-pressed={a[q.id] === true} onClick={() => setA({ ...a, [q.id]: true })}>Sim</button>
              <button type="button" data-v="nao" aria-pressed={a[q.id] === false} onClick={() => setA({ ...a, [q.id]: false })}>Não</button>
            </span>
          </li>
        ))}
      </ol>
      {done && (
        <div className={`lp-res lp-res-${r.faixa}`} aria-live="polite">
          <div className="lp-res-top">
            <svg className="lp-gauge" viewBox="0 0 84 84" role="img" aria-label={`Nota ${r.nota} de 100`}>
              <circle cx="42" cy="42" r={R} className="lp-gauge-track" />
              <circle cx="42" cy="42" r={R} className="lp-gauge-val" strokeDasharray={L} strokeDashoffset={L * (1 - r.nota / 100)} transform="rotate(-90 42 42)" />
              <text x="42" y="51" className="lp-gauge-n">{r.nota}</text>
            </svg>
            <div><h3>{FAIXA[r.faixa].t}</h3><p>{FAIXA[r.faixa].d}</p></div>
          </div>
          {r.faltas.length > 0 && <><p><b>O que falta, do mais importante para o menos:</b></p><ul>{r.faltas.map((f) => <li key={f}>{f}</li>)}</ul></>}
          {href
            ? <a className="lp-btn lp-btn-main lp-btn-lg lp-btn-block" href={href} target="_blank" rel="noopener"><Icon name="chat" /> Receber o diagnóstico completo grátis</a>
            : <p className="lp-note">Peça o diagnóstico completo para quem te enviou esta página.</p>}
        </div>
      )}
      {!done && <p className="lp-note" style={{ margin: "12px 0 0" }}>Responda todas para ver a nota. Nada é enviado até você tocar no botão.</p>}
    </div>
  );
}

/** Quanto o dono perde por mês: as suposições ficam à vista e podem ser trocadas. */
export function OwnerLoss({ who }: { who: Who }) {
  const [buscas, setBuscas] = useState(300);
  const [vira, setVira] = useState(10);
  const [fatia, setFatia] = useState(33);
  const [ticket, setTicket] = useState(120);
  const r = monthlyLoss({ buscas, viramClientePct: vira, suaFatiaPct: fatia, ticket });
  const num = (v: string) => Number(v.replace(/\D/g, "")) || 0;
  return (
    <div className="lp-lossbox" role="group" aria-label="Calculadora do que você perde por mês">
      <div className="lp-calc-in lp-calc">
        <label className="lp-range">Pessoas que procuram {who.nicho || "o seu serviço"} {who.cidade ? `em ${who.cidade}` : "na sua cidade"} por mês <output>{buscas}</output>
          <input type="range" min={50} max={3000} step={50} value={buscas} onChange={(e) => setBuscas(+e.target.value)} />
          <span className="lp-hint">No Perfil da Empresa, em “Desempenho”, o Google mostra quantas pessoas viram o seu perfil.</span>
        </label>
        <label className="lp-range">De cada 100, quantas viram cliente de alguém do mapa <output>{vira}</output>
          <input type="range" min={1} max={40} value={vira} onChange={(e) => setVira(+e.target.value)} />
        </label>
        <label className="lp-range">Parte que seria sua se você aparecesse entre os 3 primeiros <output>{fatia}%</output>
          <input type="range" min={5} max={60} value={fatia} onChange={(e) => setFatia(+e.target.value)} />
        </label>
        <label>Quanto vale um cliente para você (R$)
          <input inputMode="numeric" value={ticket.toLocaleString("pt-BR")} onChange={(e) => setTicket(num(e.target.value))} />
        </label>
      </div>
      <div className="lp-loss-out" aria-live="polite">
        <p>Indo para o concorrente todo mês:</p>
        <p><strong>{brl(r.mensal)}</strong></p>
        <p><b>{r.clientes} clientes</b> por mês, ou <b>{brl(r.anual)}</b> em um ano.</p>
        <small>Conta com os números acima, que são suposições. Troque pelos seus.</small>
      </div>
    </div>
  );
}
