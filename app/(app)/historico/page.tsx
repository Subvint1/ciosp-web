import Link from "next/link";
import { carregarPerfil } from "@/lib/perfil";
import { buscarContagens, primeiroDiaComDados, type Filtro } from "@/lib/consultas";
import {
  classificarEquipe,
  classificarPessoa,
  compararTurnos,
  intervalo,
  lerPeriodo,
  mesesEntre,
  nomeMes,
  resumirPeriodo,
  totalPorPessoa,
  type Comparacao,
  type Periodo,
  type ResumoPeriodo,
} from "@/lib/historico";
import { formatarDia, hojeCuiaba, NOME_TURNO, TURNOS, type Papel, type Turno } from "@/lib/tempo";
import GraficoBarras from "@/components/GraficoBarras";
import GraficoTurnos from "@/components/GraficoTurnos";

export const dynamic = "force-dynamic";

type Membro = { id: string; nome: string; login: string; papel: Papel; turno: Turno | null; meta_diaria: number; ativo: boolean };
type Params = { ver?: string; u?: string; t?: string; p?: string; m?: string; a?: string };
type Visao =
  | { tipo: "eu" }
  | { tipo: "pessoa"; alvo: Membro }
  | { tipo: "turno"; turno: Turno }
  | { tipo: "comparar" };

export default async function PaginaHistorico({ searchParams }: { searchParams: Promise<Params> }) {
  const { supabase, perfil } = await carregarPerfil();
  const hoje = hojeCuiaba();
  const params = await searchParams;
  const periodo = lerPeriodo(params, hoje);

  const veEquipe = perfil.papel !== "operador";
  const veTodos = perfil.papel === "supervisor_geral" || perfil.papel === "admin";

  // Quem esta pessoa pode ver (o banco já filtra: supervisor de turno recebe só o turno dele).
  let membros: Membro[] = [];
  if (veEquipe) {
    const { data } = await supabase.from("perfis").select("id, nome, login, papel, turno, meta_diaria, ativo");
    membros = ((data ?? []) as Membro[]).sort(
      (a, b) => TURNOS.indexOf(a.turno ?? "noite") - TURNOS.indexOf(b.turno ?? "noite") || a.nome.localeCompare(b.nome),
    );
  }
  const porId = new Map(membros.map((m) => [m.id, m]));

  // Decide a visão pedida, só dentro do que o papel permite.
  const turnoPadrao: Turno = perfil.turno ?? "tarde";
  let visao: Visao = { tipo: "eu" };
  if (veEquipe && params.ver === "pessoa") {
    const alvo = porId.get(params.u ?? "") ?? membros.find((m) => m.id !== perfil.id);
    if (alvo) visao = { tipo: "pessoa", alvo };
  } else if (veEquipe && params.ver === "turno") {
    const pedido = (TURNOS as string[]).includes(params.t ?? "") ? (params.t as Turno) : turnoPadrao;
    visao = { tipo: "turno", turno: veTodos ? pedido : turnoPadrao };
  } else if (veTodos && params.ver === "comparar") {
    visao = { tipo: "comparar" };
  }

  const filtro: Filtro =
    visao.tipo === "eu" ? { usuarioId: perfil.id }
    : visao.tipo === "pessoa" ? { usuarioId: visao.alvo.id }
    : visao.tipo === "turno" ? { turno: visao.turno }
    : {};

  const primeiro = (await primeiroDiaComDados(supabase, filtro)) ?? hoje;
  const { de, ate } = intervalo(periodo, primeiro, hoje);
  const { linhas, erro } = await buscarContagens(supabase, { ...filtro, de, ate });

  const meses = mesesEntre(primeiro.slice(0, 7), hoje.slice(0, 7)).reverse();
  const anos = [...new Set(meses.map((m) => m.slice(0, 4)))];

  // Mantém os outros parâmetros ao trocar uma aba.
  const atual: Params = {
    ver: visao.tipo,
    u: visao.tipo === "pessoa" ? visao.alvo.id : undefined,
    t: visao.tipo === "turno" ? visao.turno : undefined,
    p: periodo.tipo,
    m: periodo.tipo === "mes" ? periodo.mes : undefined,
    a: periodo.tipo === "ano" ? periodo.ano : undefined,
  };
  const link = (mudar: Params) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...atual, ...mudar })) if (v) q.set(k, v);
    return `/historico?${q.toString()}`;
  };

  const csvParams = new URLSearchParams({ de, ate });
  if (visao.tipo === "pessoa") csvParams.set("u", visao.alvo.id);
  if (visao.tipo === "turno") csvParams.set("t", visao.turno);
  if (visao.tipo === "comparar") csvParams.set("escopo", "tudo");
  const csv = `/painel/csv?${csvParams.toString()}`;

  const nomePeriodo =
    periodo.tipo === "mes" ? nomeMes(periodo.mes, true)
    : periodo.tipo === "ano" ? `Ano de ${periodo.ano}`
    : `Desde ${formatarDia(primeiro, true)}`;

  const primeiroColega = membros.find((m) => m.id !== perfil.id);

  return (
    <>
      <h1>Histórico</h1>

      {veEquipe && (
        <nav className="abas" aria-label="O que ver">
          <Link href={link({ ver: "eu", u: undefined, t: undefined })} className={visao.tipo === "eu" ? "ativa" : ""}>Meu histórico</Link>
          {primeiroColega && (
            <Link href={link({ ver: "pessoa", u: visao.tipo === "pessoa" ? visao.alvo.id : primeiroColega.id, t: undefined })} className={visao.tipo === "pessoa" ? "ativa" : ""}>Por pessoa</Link>
          )}
          <Link href={link({ ver: "turno", u: undefined, t: visao.tipo === "turno" ? visao.turno : turnoPadrao })} className={visao.tipo === "turno" ? "ativa" : ""}>
            {veTodos ? "Total por turno" : `Total do turno ${NOME_TURNO[turnoPadrao]}`}
          </Link>
          {veTodos && (
            <Link href={link({ ver: "comparar", u: undefined, t: undefined })} className={visao.tipo === "comparar" ? "ativa" : ""}>Comparar turnos</Link>
          )}
        </nav>
      )}

      <nav className="abas abas-secundarias" aria-label="Período">
        <Link href={link({ p: "mes", a: undefined })} className={periodo.tipo === "mes" ? "ativa" : ""}>Mês</Link>
        <Link href={link({ p: "ano", m: undefined })} className={periodo.tipo === "ano" ? "ativa" : ""}>Ano</Link>
        <Link href={link({ p: "geral", m: undefined, a: undefined })} className={periodo.tipo === "geral" ? "ativa" : ""}>Geral</Link>
      </nav>

      {(periodo.tipo !== "geral" || visao.tipo === "pessoa" || (visao.tipo === "turno" && veTodos)) && (
        <form method="get" action="/historico" style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
          <input type="hidden" name="ver" value={visao.tipo} />
          <input type="hidden" name="p" value={periodo.tipo} />
          {visao.tipo === "pessoa" && (
            <label style={{ minWidth: 220 }}>
              Pessoa
              <select name="u" defaultValue={visao.alvo.id}>
                {membros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}{m.turno ? ` · ${NOME_TURNO[m.turno]}` : ""}{m.ativo ? "" : " (desativada)"}
                  </option>
                ))}
              </select>
            </label>
          )}
          {visao.tipo === "turno" && veTodos && (
            <label style={{ minWidth: 160 }}>
              Turno
              <select name="t" defaultValue={visao.turno}>
                {TURNOS.map((t) => <option key={t} value={t}>{NOME_TURNO[t]}</option>)}
              </select>
            </label>
          )}
          {periodo.tipo === "mes" && (
            <label style={{ minWidth: 200 }}>
              Mês
              <select name="m" defaultValue={periodo.mes}>
                {(meses.includes(periodo.mes) ? meses : [periodo.mes, ...meses]).map((m) => (
                  <option key={m} value={m}>{nomeMes(m, true)}</option>
                ))}
              </select>
            </label>
          )}
          {periodo.tipo === "ano" && (
            <label style={{ minWidth: 120 }}>
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
      ) : visao.tipo === "comparar" ? (
        <BlocoComparacao c={compararTurnos(linhas, periodo, de, ate)} titulo={nomePeriodo} csv={csv} />
      ) : visao.tipo === "turno" ? (
        <BlocoTurno
          turno={visao.turno}
          titulo={nomePeriodo}
          csv={csv}
          periodo={periodo}
          r={resumirPeriodo(
            linhas,
            classificarEquipe(new Set(membros.filter((m) => m.turno === visao.turno).map((m) => m.id))),
            periodo, de, ate,
          )}
          porPessoa={totalPorPessoa(linhas, de, ate)}
          porId={porId}
        />
      ) : (
        <BlocoIndividual
          nome={visao.tipo === "pessoa" ? visao.alvo.nome : null}
          turno={visao.tipo === "pessoa" ? visao.alvo.turno : perfil.turno}
          meta={visao.tipo === "pessoa" ? visao.alvo.meta_diaria : perfil.meta_diaria}
          titulo={nomePeriodo}
          csv={csv}
          r={resumirPeriodo(
            linhas,
            classificarPessoa(visao.tipo === "pessoa" ? visao.alvo.turno : perfil.turno),
            periodo, de, ate,
          )}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------- blocos

function Kpis({ r }: { r: ResumoPeriodo }) {
  return (
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
  );
}

function CabecalhoGrafico({ r, csv }: { r: { granularidade: "dia" | "mes" }; csv: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <h2>{r.granularidade === "dia" ? "Por dia" : "Por mês"}</h2>
      <a href={csv} className="botao botao-secundario botao-pequeno" download>BAIXAR CSV DO PERÍODO</a>
    </div>
  );
}

function TabelaBarras({ r, rotuloMeu, rotuloOutro, dividir }: { r: ResumoPeriodo; rotuloMeu: string; rotuloOutro: string; dividir: boolean }) {
  if (r.total === 0) return null;
  return (
    <details>
      <summary className="etiqueta" style={{ cursor: "pointer" }}>Ver os números</summary>
      <div className="rolagem">
        <table>
          <thead>
            <tr>
              <th>{r.granularidade === "dia" ? "Dia" : "Mês"}</th>
              {dividir && <th className="num">{rotuloMeu}</th>}
              {dividir && <th className="num">{rotuloOutro}</th>}
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {[...r.barras].reverse().filter((b) => b.total > 0).map((b) => (
              <tr key={b.chave}>
                <td>{r.granularidade === "dia" ? formatarDia(b.chave, true) : nomeMes(b.chave, true)}</td>
                {dividir && <td className="num">{b.meu}</td>}
                {dividir && <td className="num">{b.outro}</td>}
                <td className="num">{b.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function BlocoIndividual({
  nome, turno, meta, titulo, csv, r,
}: { nome: string | null; turno: Turno | null; meta: number; titulo: string; csv: string; r: ResumoPeriodo }) {
  const dividir = turno !== null;
  return (
    <>
      <section className="cartao">
        <h2>{nome ? `${nome} · ` : ""}{titulo}</h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div className="numero-grande">{r.total}</div>
          <div style={{ display: "grid", gap: 4, paddingBottom: 6 }}>
            <div>checagens no período</div>
            {dividir && (
              <div className="etiqueta">
                {r.meu} no turno do perfil ({NOME_TURNO[turno!]}) · {r.outro} em outro turno
              </div>
            )}
          </div>
        </div>
      </section>
      <Kpis r={r} />
      <section className="cartao">
        <CabecalhoGrafico r={r} csv={csv} />
        {r.total === 0 ? (
          <p className="etiqueta">Nenhuma checagem neste período.</p>
        ) : (
          <GraficoBarras
            barras={r.barras}
            meta={r.granularidade === "dia" ? meta : undefined}
            descricao={`Checagens ${r.granularidade === "dia" ? "por dia" : "por mês"}: ${titulo}`}
            rotuloMeu="no turno do perfil"
          />
        )}
        {dividir && r.total > 0 && (
          <div className="legenda">
            <span><i style={{ background: "var(--meu-turno)" }} />No turno do perfil</span>
            <span><i style={{ background: "var(--outro-turno)" }} />Em outro turno</span>
          </div>
        )}
        <TabelaBarras r={r} rotuloMeu="No turno do perfil" rotuloOutro="Em outro turno" dividir={dividir} />
      </section>
    </>
  );
}

function BlocoTurno({
  turno, titulo, csv, r, porPessoa, porId,
}: {
  turno: Turno; titulo: string; csv: string; periodo: Periodo; r: ResumoPeriodo;
  porPessoa: Map<string, number>; porId: Map<string, Membro>;
}) {
  const conhecidos = [...porPessoa.entries()]
    .filter(([id]) => porId.has(id))
    .map(([id, total]) => ({ m: porId.get(id)!, total }))
    .sort((a, b) => b.total - a.total);
  const ocultos = [...porPessoa.entries()].filter(([id]) => !porId.has(id)).reduce((s, [, t]) => s + t, 0);

  return (
    <>
      <section className="cartao">
        <h2>Turno {NOME_TURNO[turno]} · {titulo}</h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div className="numero-grande">{r.total}</div>
          <div style={{ display: "grid", gap: 4, paddingBottom: 6 }}>
            <div>checagens feitas no horário do turno</div>
            <div className="etiqueta">{r.meu} pela equipe do turno · {r.outro} por operadores de outros turnos</div>
          </div>
        </div>
      </section>
      <Kpis r={r} />
      <section className="cartao">
        <CabecalhoGrafico r={r} csv={csv} />
        {r.total === 0 ? (
          <p className="etiqueta">Nenhuma checagem neste período.</p>
        ) : (
          <GraficoBarras
            barras={r.barras}
            descricao={`Checagens do turno ${NOME_TURNO[turno]}: ${titulo}`}
            rotuloMeu="pela equipe"
            rotuloOutro="por outros turnos"
          />
        )}
        {r.total > 0 && (
          <div className="legenda">
            <span><i style={{ background: "var(--meu-turno)" }} />Equipe do turno</span>
            <span><i style={{ background: "var(--outro-turno)" }} />Operadores de outros turnos</span>
          </div>
        )}
        <TabelaBarras r={r} rotuloMeu="Equipe" rotuloOutro="Outros turnos" dividir />
      </section>
      {r.total > 0 && (
        <section className="cartao">
          <h2>Por pessoa no período</h2>
          <div className="rolagem">
            <table>
              <thead>
                <tr><th className="num">#</th><th>Nome</th><th className="num">Checagens</th><th className="num">Parcela</th></tr>
              </thead>
              <tbody>
                {conhecidos.map(({ m, total }, i) => (
                  <tr key={m.id}>
                    <td className="num">{i + 1}</td>
                    <td>
                      {m.nome}
                      {m.turno !== turno && <span className="etiqueta"> · turno {m.turno ? NOME_TURNO[m.turno] : "sem turno"}</span>}
                    </td>
                    <td className="num">{total}</td>
                    <td className="num">{Math.round((total / r.total) * 100)}%</td>
                  </tr>
                ))}
                {ocultos > 0 && (
                  <tr>
                    <td />
                    <td className="etiqueta">Operadores de outros turnos</td>
                    <td className="num">{ocultos}</td>
                    <td className="num">{Math.round((ocultos / r.total) * 100)}%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function BlocoComparacao({ c, titulo, csv }: { c: Comparacao; titulo: string; csv: string }) {
  const lider = [...c.turnos].sort((a, b) => b.total - a.total)[0];
  return (
    <>
      <section className="cartao">
        <h2>Comparação entre turnos · {titulo}</h2>
        {c.totalGeral === 0 ? (
          <p className="etiqueta">Nenhuma checagem neste período.</p>
        ) : (
          <p>
            <strong>{NOME_TURNO[lider.turno]}</strong> fez mais checagens no período: {lider.total} de {c.totalGeral} (
            {Math.round(lider.parcela * 100)}%).
          </p>
        )}
        <div className="rolagem">
          <table>
            <thead>
              <tr>
                <th>Turno</th>
                <th className="num">Checagens</th>
                <th className="num">Parcela</th>
                <th className="num">Dias com checagem</th>
                <th className="num">Média por dia</th>
              </tr>
            </thead>
            <tbody>
              {c.turnos.map((t) => (
                <tr key={t.turno}>
                  <td>
                    <i style={{ display: "inline-block", width: 10, height: 10, marginRight: 8, background: `var(--turno-${t.turno})` }} />
                    {NOME_TURNO[t.turno]}
                  </td>
                  <td className="num">{t.total}</td>
                  <td className="num">{Math.round(t.parcela * 100)}%</td>
                  <td className="num">{t.diasComChecagem}</td>
                  <td className="num">{t.mediaPorDia}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Todos</strong></td>
                <td className="num"><strong>{c.totalGeral}</strong></td>
                <td className="num">100%</td>
                <td /><td />
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="etiqueta">
          Cada checagem conta no turno da hora em que foi feita. O histórico importado da planilha
          antiga entra no turno do perfil de quem fez.
        </p>
      </section>
      {c.totalGeral > 0 && (
        <section className="cartao">
          <CabecalhoGrafico r={c} csv={csv} />
          <GraficoTurnos pontos={c.pontos} descricao={`Checagens por turno: ${titulo}`} />
          <div className="legenda">
            {TURNOS.map((t) => (
              <span key={t}><i style={{ background: `var(--turno-${t})` }} />{NOME_TURNO[t]}</span>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
