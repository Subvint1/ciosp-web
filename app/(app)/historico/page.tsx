import Link from "next/link";
import { carregarPerfil } from "@/lib/perfil";
import { buscarContagens, primeiroDiaComDados } from "@/lib/consultas";
import { intervalo, lerPeriodo, mesesEntre, nomeMes, resumirPeriodo } from "@/lib/historico";
import { formatarDia, hojeCuiaba, NOME_TURNO } from "@/lib/tempo";
import GraficoBarras from "@/components/GraficoBarras";

export const dynamic = "force-dynamic";

export default async function PaginaHistorico({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; m?: string; a?: string }>;
}) {
  const { supabase, perfil } = await carregarPerfil();
  const hoje = hojeCuiaba();
  const params = await searchParams;
  const periodo = lerPeriodo(params, hoje);

  const primeiro = (await primeiroDiaComDados(supabase, perfil.id)) ?? hoje;
  const { de, ate } = intervalo(periodo, primeiro, hoje);
  const { linhas, erro } = await buscarContagens(supabase, perfil.id, de, ate);
  const r = resumirPeriodo(linhas, perfil.turno, periodo, de, ate);

  const meses = mesesEntre(primeiro.slice(0, 7), hoje.slice(0, 7)).reverse();
  const anos = [...new Set(meses.map((m) => m.slice(0, 4)))];
  const temTurno = perfil.turno !== null;

  const titulo =
    periodo.tipo === "mes"
      ? nomeMes(periodo.mes, true)
      : periodo.tipo === "ano"
        ? `Ano de ${periodo.ano}`
        : `Desde ${formatarDia(primeiro, true)}`;

  return (
    <>
      <h1>Histórico</h1>

      <nav className="abas" aria-label="Período">
        <Link href="/historico?p=mes" className={periodo.tipo === "mes" ? "ativa" : ""}>Mês</Link>
        <Link href="/historico?p=ano" className={periodo.tipo === "ano" ? "ativa" : ""}>Ano</Link>
        <Link href="/historico?p=geral" className={periodo.tipo === "geral" ? "ativa" : ""}>Geral</Link>
      </nav>

      {periodo.tipo !== "geral" && (
        <form method="get" action="/historico" style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
          <input type="hidden" name="p" value={periodo.tipo} />
          {periodo.tipo === "mes" ? (
            <label style={{ minWidth: 220 }}>
              Mês
              <select name="m" defaultValue={periodo.mes}>
                {(meses.includes(periodo.mes) ? meses : [periodo.mes, ...meses]).map((m) => (
                  <option key={m} value={m}>{nomeMes(m, true)}</option>
                ))}
              </select>
            </label>
          ) : (
            <label style={{ minWidth: 160 }}>
              Ano
              <select name="a" defaultValue={periodo.ano}>
                {(anos.includes(periodo.ano) ? anos : [periodo.ano, ...anos]).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
          )}
          <button type="submit">VER</button>
        </form>
      )}

      {erro ? (
        <p className="mensagem-erro">Não foi possível carregar o histórico. Tente recarregar a página.</p>
      ) : (
        <>
          <section className="cartao">
            <h2>{titulo}</h2>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
              <div className="numero-grande">{r.total}</div>
              <div style={{ display: "grid", gap: 4, paddingBottom: 6 }}>
                <div>checagens no período</div>
                {temTurno && (
                  <div className="etiqueta">
                    {r.meu} no seu turno ({NOME_TURNO[perfil.turno!]}) · {r.outro} em outro turno
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="grade-kpi">
            <div className="kpi">
              <div className="rotulo">Dias com checagem</div>
              <div className="valor">{r.diasTrabalhados}</div>
            </div>
            <div className="kpi">
              <div className="rotulo">Média por dia</div>
              <div className="valor">{r.mediaDiaTrabalhado}</div>
              <div className="detalhe">nos dias com checagem</div>
            </div>
            <div className="kpi">
              <div className="rotulo">Melhor dia</div>
              <div className="valor">{r.melhorDia ? r.melhorDia.total : "—"}</div>
              <div className="detalhe">{r.melhorDia ? formatarDia(r.melhorDia.dia, true) : "sem dados"}</div>
            </div>
            {r.granularidade === "mes" && (
              <div className="kpi">
                <div className="rotulo">Melhor mês</div>
                <div className="valor">{r.melhorMes ? r.melhorMes.total : "—"}</div>
                <div className="detalhe">{r.melhorMes ? nomeMes(r.melhorMes.mes, true) : "sem dados"}</div>
              </div>
            )}
          </div>

          <section className="cartao">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h2>{r.granularidade === "dia" ? "Por dia" : "Por mês"}</h2>
              <a href={`/painel/csv?de=${de}&ate=${ate}`} className="botao botao-secundario botao-pequeno" download>
                BAIXAR CSV DO PERÍODO
              </a>
            </div>
            {r.total === 0 ? (
              <p className="etiqueta">Nenhuma checagem neste período.</p>
            ) : (
              <GraficoBarras
                barras={r.barras}
                meta={r.granularidade === "dia" ? perfil.meta_diaria : undefined}
                descricao={`Checagens ${r.granularidade === "dia" ? "por dia" : "por mês"}: ${titulo}`}
              />
            )}
            {temTurno && r.total > 0 && (
              <div className="legenda">
                <span><i style={{ background: "var(--meu-turno)" }} />No seu turno</span>
                <span><i style={{ background: "var(--outro-turno)" }} />Em outro turno</span>
              </div>
            )}
            {r.total > 0 && (
              <details>
                <summary className="etiqueta" style={{ cursor: "pointer" }}>Ver os números</summary>
                <div className="rolagem">
                  <table>
                    <thead>
                      <tr>
                        <th>{r.granularidade === "dia" ? "Dia" : "Mês"}</th>
                        {temTurno && <th className="num">No seu turno</th>}
                        {temTurno && <th className="num">Em outro turno</th>}
                        <th className="num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...r.barras].reverse().filter((b) => b.total > 0).map((b) => (
                        <tr key={b.chave}>
                          <td>{r.granularidade === "dia" ? formatarDia(b.chave, true) : nomeMes(b.chave, true)}</td>
                          {temTurno && <td className="num">{b.meu}</td>}
                          {temTurno && <td className="num">{b.outro}</td>}
                          <td className="num">{b.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </section>
        </>
      )}
    </>
  );
}
