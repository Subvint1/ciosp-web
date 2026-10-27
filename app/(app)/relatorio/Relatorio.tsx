import Link from "next/link";
import type { LinhaContagem } from "@/lib/painel";
import type { Perfil } from "@/lib/perfil";
import {
  DIAS_UTEIS,
  indicadores,
  linhasFiltradas,
  type Filtros,
  metaDeReferencia,
  NOME_PRESET,
  porDiaDaSemana,
  porTurno,
  ranking,
  serieAgrupada,
  type Membro,
  type Ordem,
} from "@/lib/relatorio";
import { formatarDia, hojeCuiaba, NOME_TURNO } from "@/lib/tempo";
import GraficoAgrupado, { CORES } from "@/components/relatorio/GraficoAgrupado";
import Rosca from "@/components/relatorio/Rosca";
import BarrasSemana from "@/components/relatorio/BarrasSemana";
import FiltrosRelatorio from "./FiltrosRelatorio";

const n = (v: number) => v.toLocaleString("pt-BR");
const ROTULO_META = { dia: "META DIÁRIA", semana: "META SEMANAL", mes: "META MENSAL" } as const;

// Desenha o relatório a partir dos dados já buscados (a página busca; isto só calcula e mostra).
export default function Relatorio({
  perfil, todos, membros, f, linhas, erro, params,
}: {
  perfil: Pick<Perfil, "id" | "papel" | "turno">;
  todos: Membro[];
  membros: Membro[];
  f: Filtros;
  linhas: LinhaContagem[];
  erro: boolean;
  params: Record<string, string | string[] | undefined>;
}) {
  const ls = linhasFiltradas(linhas, membros, f);
  const rank = ranking(ls, membros, f.ordem);
  const k = indicadores(ls);
  const serie = serieAgrupada(ls, rank, f.agrupar, f.de, f.ate);
  const meta = metaDeReferencia(membros, f);
  const turnos = porTurno(ls);
  const semana = porDiaDaSemana(ls);
  const maiorTotal = Math.max(...rank.map((r) => r.total), 1);

  // Link para ordenar a tabela mantendo os outros filtros.
  const linkOrdem = (ordem: Ordem) => {
    const q = new URLSearchParams();
    for (const [chave, v] of Object.entries(params)) {
      if (chave === "ordem" || v === undefined) continue;
      for (const item of Array.isArray(v) ? v : [v]) q.append(chave, item);
    }
    q.set("ordem", ordem);
    return `/relatorio?${q.toString()}`;
  };
  const Cab = ({ ordem, children, num }: { ordem: Ordem; children: React.ReactNode; num?: boolean }) => (
    <th className={num ? "num" : ""}>
      <Link href={linkOrdem(ordem)} className={f.ordem === ordem ? "ativa" : ""}>
        {children}{f.ordem === ordem ? " ▾" : ""}
      </Link>
    </th>
  );

  const periodoTexto = f.de === f.ate ? formatarDia(f.de, true) : `${formatarDia(f.de, true)} a ${formatarDia(f.ate, true)}`;

  return (
    <div className="rel">
      <div className="rel-cabecalho">
        <h1>RELATÓRIO DE CHECAGENS</h1>
        <div className="rel-intervalo" title="Período do relatório">
          {NOME_PRESET[f.preset]} · {periodoTexto}
        </div>
      </div>

      <FiltrosRelatorio
        f={f}
        pessoas={todos.map((m) => ({ id: m.id, nome: m.nome, turno: m.turno }))}
        turnoFixo={perfil.papel === "supervisor_turno" ? perfil.turno : null}
      />
      <Link href="/relatorio" className="rel-redefinir">REDEFINIR FILTROS</Link>

      {erro ? (
        <p className="mensagem-erro">Não foi possível carregar os dados. Tente recarregar a página.</p>
      ) : (
        <div className="rel-tela">
          <div className="rel-kpis">
            <div className="rel-kpi" style={{ borderTopColor: CORES[0] }}>
              <span>Checagens</span><strong>{n(k.total)}</strong>
            </div>
            <div className="rel-kpi" style={{ borderTopColor: CORES[1] }}>
              <span>Pessoas com checagem</span><strong>{n(k.pessoas)}</strong>
            </div>
            <div className="rel-kpi" style={{ borderTopColor: CORES[2] }}>
              <span>Média por pessoa</span><strong>{n(k.mediaPorPessoa)}</strong>
            </div>
            <div className="rel-kpi" style={{ borderTopColor: CORES[3] }}>
              <span>Média por dia</span><strong>{n(k.mediaPorDia)}</strong>
              <small>{n(k.diasComChecagem)} dias com checagem</small>
            </div>
            <div className="rel-kpi" style={{ borderTopColor: CORES[4] }}>
              <span>Melhor dia</span><strong>{k.melhorDia ? n(k.melhorDia.total) : "—"}</strong>
              <small>{k.melhorDia ? formatarDia(k.melhorDia.dia, true) : "sem dados"}</small>
            </div>
          </div>

          <div className="rel-grade">
            <section className="rel-cartao rel-tabela">
              <div className="rel-rolagem">
              <table>
                <thead>
                  <tr>
                    <Cab ordem="nome">NOME</Cab>
                    <Cab ordem="checagens" num>CHECAGENS</Cab>
                    <Cab ordem="dias" num>DIAS</Cab>
                    <Cab ordem="media" num>MÉDIA/DIA</Cab>
                  </tr>
                </thead>
                <tbody>
                  {rank.length === 0 && (
                    <tr><td colSpan={4} className="rel-vazio">Nenhuma checagem com estes filtros.</td></tr>
                  )}
                  {rank.map((r) => (
                    <tr key={r.id} className={r.id === perfil.id ? "rel-eu" : ""}>
                      <td>
                        {r.nome}
                        <small>{r.turno ? NOME_TURNO[r.turno] : "Sem turno"}{r.ativo ? "" : " · desativada"}</small>
                      </td>
                      <td className="num">
                        <div className="rel-barra-celula">
                          <span style={{ width: `${(r.total / maiorTotal) * 100}%` }} />
                          <b>{n(r.total)}</b>
                        </div>
                        <small>{r.parcela < 0.01 ? "<1" : Math.round(r.parcela * 100)}% do total</small>
                      </td>
                      <td className="num">{n(r.dias)}</td>
                      <td className="num">{n(r.media)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <div className="rel-rodape">{rank.length ? `1 - ${rank.length} / ${rank.length}` : "0 / 0"}</div>
            </section>

            <section className="rel-cartao rel-grafico">
              <h2>CHECAGENS POR {f.agrupar === "mes" ? "MÊS" : f.agrupar === "semana" ? "SEMANA" : "DIA"}</h2>
              {serie.series.length === 0 ? (
                <p className="rel-vazio">Nenhuma checagem com estes filtros.</p>
              ) : (
                <>
                  <div className="rel-legenda">
                    {serie.series.map((s, i) => (
                      <span key={s.id}>
                        <i style={{ background: s.id === "outros" ? CORES[8] : CORES[i % 8] }} />
                        {s.nome}
                      </span>
                    ))}
                  </div>
                  <GraficoAgrupado dados={serie} meta={meta?.valor ?? null} rotuloMeta={ROTULO_META[f.agrupar]} />
                  {meta && (
                    <p className="rel-nota">
                      {meta.calculada
                        ? `Meta de referência por pessoa: meta diária média (${Math.round(meta.valor / DIAS_UTEIS[f.agrupar])}) × ${DIAS_UTEIS[f.agrupar]} ${DIAS_UTEIS[f.agrupar] === 1 ? "dia" : "dias úteis"}. Digite outro valor em "Meta do gráfico".`
                        : "Meta de referência digitada no filtro."}
                    </p>
                  )}
                </>
              )}
            </section>
          </div>

          <div className="rel-grade rel-grade-2">
            <section className="rel-cartao">
              <h2>POR TURNO DA CHECAGEM</h2>
              <Rosca valores={turnos} />
              <p className="rel-nota">Cada checagem conta no turno da hora em que foi feita. O histórico da planilha antiga entra no turno do perfil.</p>
            </section>
            <section className="rel-cartao">
              <h2>MÉDIA POR DIA DA SEMANA</h2>
              <BarrasSemana media={semana.media} />
              <p className="rel-nota">Média das checagens nos dias da semana em que houve checagem.</p>
            </section>
          </div>

          {perfil.papel === "supervisor_turno" && (
            <p className="rel-nota">
              Checagens feitas no horário do seu turno por operadores de outros turnos não aparecem aqui.
              Veja em Histórico &gt; Total do turno.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
