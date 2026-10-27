import type { SerieAgrupada } from "@/lib/relatorio";

// Paleta no estilo do Data Studio (cores vivas e distintas entre si).
export const CORES = ["#F9AB00", "#F4845F", "#A77BDE", "#9CBF4E", "#1DB5C8", "#E8C547", "#E46FB0", "#5B8DEF", "#9E9E9E"];

const formatar = (v: number) => v.toLocaleString("pt-BR");

// Barras agrupadas: um grupo por período, uma barra por pessoa, linha da meta
// e rótulos de valor em etiquetas, como no Data Studio.
export default function GraficoAgrupado({
  dados,
  meta,
  rotuloMeta,
}: {
  dados: SerieAgrupada;
  meta: number | null;
  rotuloMeta: string;
}) {
  const { grupos, series } = dados;
  const L = Math.max(880, grupos.length * Math.max(series.length * 14, 56) + 120);
  const A = 380, esq = 64, dir = 20, cima = 30, baixo = 40;
  const largura = L - esq - dir, altura = A - cima - baixo;
  const maior = Math.max(meta ?? 0, ...series.flatMap((s) => s.valores), 10);
  const passos = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  const passo = passos.find((p) => maior / p <= 5) ?? 25000;
  const topo = Math.ceil((maior * 1.08) / passo) * passo;
  const y = (v: number) => cima + altura - (v / topo) * altura;
  const larguraGrupo = largura / Math.max(grupos.length, 1);
  const barra = Math.max(4, Math.min(38, (larguraGrupo * 0.8) / Math.max(series.length, 1)));
  const inicioGrupo = (g: number) => esq + g * larguraGrupo + (larguraGrupo - barra * series.length) / 2;
  const marcas: number[] = [];
  for (let v = 0; v <= topo; v += passo) marcas.push(v);
  const etiquetas = barra >= 26; // com barras finas, só o maior valor do grupo ganha etiqueta
  const rotuloEixo = (v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR")} mil` : String(v));

  return (
    <div className="rel-rolagem">
      <svg
        viewBox={`0 0 ${L} ${A}`}
        role="img"
        aria-label="Checagens por período e por pessoa"
        style={{ width: L > 960 ? `${L}px` : "100%", minWidth: 640, height: "auto", display: "block" }}
      >
        <rect x={esq} y={cima} width={largura} height={altura} fill="#ffffff" stroke="#9e9e9e" strokeWidth={1} />
        {marcas.map((v) => (
          <g key={v}>
            <line x1={esq} x2={L - dir} y1={y(v)} y2={y(v)} stroke="#e3e3e3" />
            <text x={esq - 8} y={y(v) + 4} textAnchor="end" fontSize={12} fontWeight={700} fill="#222">{rotuloEixo(v)}</text>
          </g>
        ))}
        {grupos.map((g, gi) => (
          <line key={g.chave} x1={esq + gi * larguraGrupo} x2={esq + gi * larguraGrupo} y1={cima} y2={cima + altura} stroke="#eeeeee" />
        ))}
        {grupos.map((g, gi) => {
          const maiorDoGrupo = Math.max(...series.map((s) => s.valores[gi]));
          return (
            <g key={g.chave}>
              {series.map((s, si) => {
                const v = s.valores[gi];
                const x = inicioGrupo(gi) + si * barra;
                const cor = s.id === "outros" ? CORES[8] : CORES[si % 8];
                const comEtiqueta = v > 0 && (etiquetas || v === maiorDoGrupo);
                return (
                  <g key={s.id}>
                    <title>{`${s.nome} · ${g.rotulo}: ${formatar(v)}`}</title>
                    <rect x={x + 1} y={y(v)} width={barra - 2} height={y(0) - y(v)} fill={cor} stroke="#333" strokeWidth={0.6} />
                    {comEtiqueta && (
                      <g>
                        <rect x={x + barra / 2 - formatar(v).length * 4.2 - 5} y={y(v) - 22} width={formatar(v).length * 8.4 + 10} height={18} rx={3} fill="#FBBC04" />
                        <text x={x + barra / 2} y={y(v) - 9} textAnchor="middle" fontSize={12} fontWeight={700} fill="#111">{formatar(v)}</text>
                      </g>
                    )}
                  </g>
                );
              })}
              <text x={esq + gi * larguraGrupo + larguraGrupo / 2} y={A - 14} textAnchor="middle" fontSize={13} fontWeight={700} fill="#222">
                {g.rotulo}
              </text>
            </g>
          );
        })}
        {meta !== null && (
          <g>
            <line x1={esq} x2={L - dir} y1={y(meta)} y2={y(meta)} stroke="#F9AB00" strokeWidth={2.5} strokeDasharray="10 6" />
            <rect x={esq + 4} y={y(meta) - 26} width={rotuloMeta.length * 8 + 16} height={22} fill="#FDE293" />
            <text x={esq + 12} y={y(meta) - 10} fontSize={13} fill="#3c2a00">{rotuloMeta} · {formatar(meta)}</text>
          </g>
        )}
      </svg>
    </div>
  );
}
