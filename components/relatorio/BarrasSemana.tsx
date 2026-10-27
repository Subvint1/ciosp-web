import { DIAS_SEMANA } from "@/lib/relatorio";

// Média de checagens por dia da semana (contando só os dias com checagem).
export default function BarrasSemana({ media }: { media: number[] }) {
  const L = 420, A = 200, esq = 10, dir = 10, cima = 28, baixo = 26;
  const maior = Math.max(...media, 1);
  const coluna = (L - esq - dir) / 7;
  const barra = coluna * 0.62;
  const altura = A - cima - baixo;
  return (
    <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label="Média de checagens por dia da semana" style={{ width: "100%", height: "auto", display: "block" }}>
      <line x1={esq} x2={L - dir} y1={A - baixo} y2={A - baixo} stroke="#9e9e9e" />
      {media.map((v, i) => {
        const h = (v / maior) * altura;
        const x = esq + i * coluna + (coluna - barra) / 2;
        return (
          <g key={i}>
            <title>{`${DIAS_SEMANA[i]}: média de ${v} por dia`}</title>
            <rect x={x} y={A - baixo - h} width={barra} height={h} fill={v === maior ? "#F9AB00" : "#FDD663"} stroke="#333" strokeWidth={0.6} />
            {v > 0 && (
              <text x={x + barra / 2} y={A - baixo - h - 7} textAnchor="middle" fontSize={13} fontWeight={700} fill="#111">{v}</text>
            )}
            <text x={x + barra / 2} y={A - 8} textAnchor="middle" fontSize={12} fontWeight={700} fill="#333">{DIAS_SEMANA[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}
