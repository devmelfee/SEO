"use client";
import { useState } from "react";
import { PER_PROPOSAL, WEEK_TASKS, weekHours } from "@/lib/landing";
import { Icon } from "./Icon";

const h = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
const min = (n: number) => (n < 1 ? `${Math.round(n * 60)} s` : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min`);

/** A mesma semana lado a lado: à mão contra com o app. O visitante ajusta o volume e vê as horas mudarem. */
export function WeekCompare() {
  const [empresas, setEmpresas] = useState(40);
  const [propostas, setPropostas] = useState(4);
  const [side, setSide] = useState<"mao" | "app">("mao");
  const w = weekHours(empresas, propostas);
  const scale = Math.max(w.mao, 1);

  const Col = ({ k, title }: { k: "mao" | "app"; title: string }) => (
    <div className={`lp-week-col lp-week-${k}`} data-on={side === k}>
      <h3>{title}</h3>
      <ul>
        {WEEK_TASKS.map((t) => (
          <li key={t.t}><span>{t.t}</span><b>{t[k] === 0 ? "já vem pronto" : `${min(t[k])} por empresa`}</b></li>
        ))}
        <li><span>Site de prévia e proposta com o nome da empresa</span><b>{min(PER_PROPOSAL[k])} cada</b></li>
      </ul>
      <div className="lp-week-total">
        <div className="lp-week-bar"><i style={{ width: `${Math.max(2, (w[k] / scale) * 100)}%` }} /></div>
        <p><strong>{h(w[k])}</strong> na semana</p>
      </div>
    </div>
  );

  return (
    <div className="lp-week" role="group" aria-label="Comparação da semana de prospecção">
      <div className="lp-week-ctl">
        <label className="lp-range">Empresas abordadas por semana <output>{empresas}</output>
          <input type="range" min={10} max={150} step={5} value={empresas} onChange={(e) => setEmpresas(+e.target.value)} />
        </label>
        <label className="lp-range">Propostas por semana <output>{propostas}</output>
          <input type="range" min={0} max={15} value={propostas} onChange={(e) => setPropostas(+e.target.value)} />
        </label>
      </div>
      <div className="lp-seg lp-week-tabs" role="tablist" aria-label="Ver a semana">
        <button role="tab" aria-selected={side === "mao"} onClick={() => setSide("mao")}>À mão</button>
        <button role="tab" aria-selected={side === "app"} onClick={() => setSide("app")}>Com o app</button>
      </div>
      <div className="lp-week-cols">
        <Col k="mao" title="À mão: planilha, Google e copiar e colar" />
        <Col k="app" title="Com o app" />
      </div>
      <p className="lp-week-sum"><Icon name="clock" /> <span>São <strong>{h(w.poupadas)}</strong> de volta toda semana para fazer o que fecha contrato: conversar com o dono.</span></p>
      <small className="lp-note">Tempos estimados por tarefa. Ajuste o volume para a sua rotina.</small>
    </div>
  );
}
