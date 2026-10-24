import type { PontoComparacao } from "@/lib/historico";
import { NOME_TURNO, TURNOS, type Turno } from "@/lib/tempo";

const COR: Record<Turno, string> = {
  madrugada: "var(--turno-madrugada)",
  manha: "var(--turno-manha)",
  tarde: "var(--turno-tarde)",
  noite: "var(--turno-noite)",
};
// Traços diferentes para não depender só da cor.
const TRACO: Record<Turno, string | undefined> = {
  madrugada: undefined,
  manha: "6 4",
  tarde: undefined,
  noite: "2 3",
};
const ESPESSURA: Record<Turno, number> = { madrugada: 2, manha: 2, tarde: 2.75, noite: 2 };

// Uma linha por turno ao longo do período (dias ou meses).
export default function GraficoTurnos({ pontos, descricao }: { pontos: PontoComparacao[]; descricao: string }) {
  const n = pontos.length;
  return (
    <>
      <div className="so-largo">
        <Desenho pontos={pontos} descricao={descricao} L={720} A={260} fonte={11} cadaRotulo={n > 16 ? 5 : Math.max(1, Math.ceil(n / 12))} />
      </div>
      <div className="so-estreito">
        <Desenho pontos={pontos} descricao={descricao} L={360} A={260} fonte={12} cadaRotulo={n > 16 ? 10 : Math.max(1, Math.ceil(n / 5))} />
      </div>
    </>
  );
}

function Desenho({
  pontos,
  descricao,
  L,
  A,
  fonte,
  cadaRotulo,
}: {
  pontos: PontoComparacao[];
  descricao: string;
  L: number;
  A: number;
  fonte: number;
  cadaRotulo: number;
}) {
  const esq = L > 400 ? 44 : 40;
  const dir = L > 400 ? 86 : 8; // espaço para o nome do turno no fim da linha (só no largo)
  const cima = 16, baixo = 28;
  const larguraUtil = L - esq - dir;
  const alturaUtil = A - cima - baixo;
  const maior = Math.max(10, ...pontos.flatMap((p) => TURNOS.map((t) => p.valores[t])));
  const passos = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
  const passo = passos.find((p) => maior / p <= 6) ?? 10000;
  const topo = Math.ceil(maior / passo) * passo;
  const y = (v: number) => cima + alturaUtil - (v / topo) * alturaUtil;
  const x = (i: number) => esq + (pontos.length <= 1 ? larguraUtil / 2 : (i / (pontos.length - 1)) * larguraUtil);
  const marcas: number[] = [];
  for (let v = 0; v <= topo; v += passo * (L > 400 ? 1 : 2)) marcas.push(v);
  const ultimo = pontos.length - 1;

  // Nomes no fim das linhas, afastados para não se sobreporem.
  const fins = TURNOS.map((t) => ({ t, y: y(pontos.at(-1)?.valores[t] ?? 0) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < fins.length; i++) {
    if (fins[i].y - fins[i - 1].y < fonte + 2) fins[i].y = fins[i - 1].y + fonte + 2;
  }

  return (
    <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label={descricao} style={{ width: "100%", height: "auto", display: "block" }}>
      {marcas.map((v) => (
        <g key={v}>
          <line x1={esq} x2={L - dir} y1={y(v)} y2={y(v)} stroke="var(--borda)" strokeWidth={1} />
          <text x={esq - 6} y={y(v) + fonte / 3} textAnchor="end" fontSize={fonte} fill="var(--texto-2)">{v}</text>
        </g>
      ))}
      {pontos.map((p, i) =>
        (ultimo - i) % cadaRotulo === 0 ? (
          <text key={p.chave} x={Math.min(Math.max(x(i), esq + p.rotulo.length * fonte * 0.31), L - dir - p.rotulo.length * fonte * 0.31)} y={A - 9} textAnchor="middle" fontSize={fonte} fill="var(--texto-2)">
            {p.rotulo}
          </text>
        ) : null,
      )}
      {TURNOS.map((t) => (
        <g key={t}>
          <polyline
            points={pontos.map((p, i) => `${x(i)},${y(p.valores[t])}`).join(" ")}
            fill="none"
            stroke={COR[t]}
            strokeWidth={ESPESSURA[t]}
            strokeDasharray={TRACO[t]}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pontos.length <= 31 &&
            pontos.map((p, i) => (
              <circle key={p.chave} cx={x(i)} cy={y(p.valores[t])} r={pontos.length > 16 ? 1.8 : 3} fill={COR[t]}>
                <title>{`${NOME_TURNO[t]} · ${p.rotulo}: ${p.valores[t]}`}</title>
              </circle>
            ))}
        </g>
      ))}
      {L > 400 &&
        fins.map((f) => (
          <text key={f.t} x={L - dir + 8} y={f.y + fonte / 3} fontSize={fonte} fontWeight={600} fill={COR[f.t]}>
            {NOME_TURNO[f.t]}
          </text>
        ))}
    </svg>
  );
}
