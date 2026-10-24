import type { Barra } from "@/lib/historico";

type Props = {
  barras: Barra[];
  meta?: number; // só faz sentido quando cada barra é um dia
  descricao: string;
  rotuloMeu?: string;
  rotuloOutro?: string;
};

// Barras empilhadas: parte escura = no seu turno, parte clara = em outro turno.
// Duas versões do mesmo desenho (computador e celular), trocadas por CSS
// para as letras nunca ficarem minúsculas.
export default function GraficoBarras(props: Props) {
  const n = props.barras.length;
  return (
    <>
      <div className="so-largo">
        <Desenho {...props} L={720} A={240} fonte={11} cadaRotulo={n > 16 ? 5 : Math.max(1, Math.ceil(n / 12))} />
      </div>
      <div className="so-estreito">
        <Desenho {...props} L={360} A={240} fonte={12} cadaRotulo={n > 16 ? 10 : Math.max(1, Math.ceil(n / 5))} />
      </div>
    </>
  );
}

function Desenho({
  barras,
  meta,
  descricao,
  rotuloMeu = "no seu turno",
  rotuloOutro = "em outro turno",
  L,
  A,
  fonte,
  cadaRotulo,
}: Props & { L: number; A: number; fonte: number; cadaRotulo: number }) {
  const esq = L > 400 ? 44 : 40, dir = 8, cima = 20, baixo = 28;
  const larguraUtil = L - esq - dir;
  const alturaUtil = A - cima - baixo;
  const maior = Math.max(meta ?? 0, ...barras.map((b) => b.total), 10);
  const passos = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
  const passo = passos.find((p) => maior / p <= 6) ?? 10000;
  const topo = Math.ceil(maior / passo) * passo;
  const y = (v: number) => cima + alturaUtil - (v / topo) * alturaUtil;
  const coluna = larguraUtil / Math.max(barras.length, 1);
  const barra = Math.max(Math.min(coluna - (L > 400 ? 4 : 2), 48), 2);
  const marcas: number[] = [];
  for (let v = 0; v <= topo; v += passo * (L > 400 ? 1 : 2)) marcas.push(v);
  const ultimo = barras.length - 1;

  return (
    <svg
      viewBox={`0 0 ${L} ${A}`}
      role="img"
      aria-label={descricao}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {marcas.map((v) => (
        <g key={v}>
          <line x1={esq} x2={L - dir} y1={y(v)} y2={y(v)} stroke="var(--borda)" strokeWidth={1} />
          <text x={esq - 6} y={y(v) + fonte / 3} textAnchor="end" fontSize={fonte} fill="var(--texto-2)">
            {v}
          </text>
        </g>
      ))}
      {barras.map((b, i) => {
        const x = esq + i * coluna + (coluna - barra) / 2;
        const rotulo = (ultimo - i) % cadaRotulo === 0;
        return (
          <g key={b.chave}>
            <title>{`${b.rotulo}: ${b.total} (${b.meu} ${rotuloMeu}, ${b.outro} ${rotuloOutro})`}</title>
            <rect x={x} y={y(b.meu)} width={barra} height={y(0) - y(b.meu)} fill="var(--meu-turno)" />
            <rect
              x={x}
              y={y(b.meu + b.outro)}
              width={barra}
              height={y(b.meu) - y(b.meu + b.outro)}
              fill="var(--outro-turno)"
            />
            {rotulo && (
              <text
                x={Math.min(Math.max(x + barra / 2, esq + b.rotulo.length * fonte * 0.31), L - dir - b.rotulo.length * fonte * 0.31)}
                y={A - 9}
                textAnchor="middle"
                fontSize={fonte}
                fill="var(--texto-2)"
              >
                {b.rotulo}
              </text>
            )}
          </g>
        );
      })}
      {meta !== undefined && (
        <>
          <line
            x1={esq}
            x2={L - dir}
            y1={y(meta)}
            y2={y(meta)}
            stroke="var(--texto)"
            strokeWidth={1.25}
            strokeDasharray="5 4"
          />
          <text x={esq + 4} y={y(meta) - 5} fontSize={fonte} fill="var(--texto)">
            meta {meta}
          </text>
        </>
      )}
    </svg>
  );
}
