import type { Dia } from "@/lib/painel";
import { formatarDia } from "@/lib/tempo";

type Props = { dias: Dia[]; meta: number };

// Barras empilhadas dos últimos 30 dias: parte escura = no seu turno,
// parte clara = em outro turno. A linha tracejada é a meta diária.
// Duas versões do mesmo desenho: uma larga (computador) e uma compacta
// (celular), trocadas por CSS para as letras nunca ficarem minúsculas.
export default function Grafico30Dias(props: Props) {
  return (
    <>
      <div className="so-largo">
        <Desenho {...props} L={720} A={240} fonte={11} cadaRotulo={5} />
      </div>
      <div className="so-estreito">
        <Desenho {...props} L={360} A={240} fonte={12} cadaRotulo={10} />
      </div>
    </>
  );
}

function Desenho({
  dias,
  meta,
  L,
  A,
  fonte,
  cadaRotulo,
}: Props & { L: number; A: number; fonte: number; cadaRotulo: number }) {
  const esq = 36, dir = 8, cima = 20, baixo = 28;
  const larguraUtil = L - esq - dir;
  const alturaUtil = A - cima - baixo;
  const maior = Math.max(meta, ...dias.map((d) => d.total), 10);
  const passo = maior <= 50 ? 10 : maior <= 150 ? 25 : maior <= 400 ? 50 : 100;
  const topo = Math.ceil(maior / passo) * passo;
  const y = (v: number) => cima + alturaUtil - (v / topo) * alturaUtil;
  const coluna = larguraUtil / dias.length;
  const barra = Math.max(coluna - (L > 400 ? 4 : 2), 2);
  const marcas: number[] = [];
  for (let v = 0; v <= topo; v += passo * (L > 400 ? 1 : 2)) marcas.push(v);
  const ultimo = dias.length - 1;

  return (
    <svg
      viewBox={`0 0 ${L} ${A}`}
      role="img"
      aria-label="Checagens por dia nos últimos 30 dias"
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
      {dias.map((d, i) => {
        const x = esq + i * coluna + (coluna - barra) / 2;
        const rotulo = (ultimo - i) % cadaRotulo === 0;
        return (
          <g key={d.dia}>
            <title>{`${formatarDia(d.dia)}: ${d.total} (${d.meu} no seu turno, ${d.outro} em outro turno)`}</title>
            <rect x={x} y={y(d.meu)} width={barra} height={y(0) - y(d.meu)} fill="var(--meu-turno)" />
            <rect
              x={x}
              y={y(d.meu + d.outro)}
              width={barra}
              height={y(d.meu) - y(d.meu + d.outro)}
              fill="var(--outro-turno)"
            />
            {rotulo && (
              <text
                x={Math.min(x + barra / 2, L - dir - fonte * 1.4)}
                y={A - 9}
                textAnchor="middle"
                fontSize={fonte}
                fill="var(--texto-2)"
              >
                {formatarDia(d.dia)}
              </text>
            )}
          </g>
        );
      })}
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
    </svg>
  );
}
