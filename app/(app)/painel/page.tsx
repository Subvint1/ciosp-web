import { carregarPerfil } from "@/lib/perfil";
import { inicioDaBusca, montarResumo, type LinhaContagem } from "@/lib/painel";
import { formatarDia, hojeCuiaba, NOME_TURNO, TURNOS, turnoAgora } from "@/lib/tempo";
import Grafico30Dias from "@/components/Grafico30Dias";

export const dynamic = "force-dynamic";

export default async function PaginaPainel() {
  const { supabase, perfil } = await carregarPerfil();
  const hoje = hojeCuiaba();

  const { data, error } = await supabase
    .from("contagem_diaria")
    .select("dia, turno, total, origem")
    .eq("usuario_id", perfil.id)
    .gte("dia", inicioDaBusca(hoje))
    .lte("dia", hoje);

  if (error) {
    return <p className="mensagem-erro">Não foi possível carregar o painel. Tente recarregar a página.</p>;
  }

  const r = montarResumo((data ?? []) as LinhaContagem[], perfil.turno, hoje);
  const meta = perfil.meta_diaria;
  const faltam = Math.max(0, meta - r.hoje.total);
  const progresso = Math.min(1, r.hoje.total / meta);
  const agora = turnoAgora();
  const temTurno = perfil.turno !== null;
  const turnosHoje = TURNOS.filter((t) => (r.hojePorTurno[t] ?? 0) > 0);

  return (
    <>
      <section className="cartao">
        <h2>Hoje · {formatarDia(hoje, true)}</h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div className="numero-grande">{r.hoje.total}</div>
          <div style={{ display: "grid", gap: 4, paddingBottom: 6 }}>
            <div>
              Meta {meta} · {faltam === 0 ? "meta batida" : `faltam ${faltam}`}
            </div>
            {temTurno && (
              <div className="etiqueta">
                {r.hoje.meu} no seu turno ({NOME_TURNO[perfil.turno!]}) · {r.hoje.outro} em outro turno
              </div>
            )}
            <div className="etiqueta">Turno agora: {NOME_TURNO[agora]}</div>
          </div>
        </div>
        <div
          className="barra"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={meta}
          aria-valuenow={r.hoje.total}
          aria-label="Progresso da meta de hoje"
        >
          <span style={{ width: `${progresso * 100}%` }} />
        </div>
        {turnosHoje.length > 1 && (
          <div className="etiqueta">
            Por turno hoje: {turnosHoje.map((t) => `${NOME_TURNO[t]} ${r.hojePorTurno[t]}`).join(" · ")}
          </div>
        )}
      </section>

      <div className="grade-kpi">
        <div className="kpi">
          <div className="rotulo">Total do mês</div>
          <div className="valor">{r.totalMes}</div>
          <div className="detalhe">desde {formatarDia(`${hoje.slice(0, 7)}-01`)}</div>
        </div>
        <div className="kpi">
          <div className="rotulo">Média por dia</div>
          <div className="valor">{r.mediaDiasTrabalhados}</div>
          <div className="detalhe">{r.diasTrabalhados} dias com checagem em 30</div>
        </div>
        <div className="kpi">
          <div className="rotulo">Melhor dia</div>
          <div className="valor">{r.melhorDia ? r.melhorDia.total : "—"}</div>
          <div className="detalhe">{r.melhorDia ? formatarDia(r.melhorDia.dia, true) : "nos últimos 30 dias"}</div>
        </div>
      </div>

      <section className="cartao">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2>Últimos 30 dias</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href="/historico" className="botao botao-secundario botao-pequeno">
              VER MESES ANTERIORES
            </a>
            <a href="/painel/csv" className="botao botao-secundario botao-pequeno" download>
              BAIXAR CSV
            </a>
          </div>
        </div>
        <Grafico30Dias dias={r.dias} meta={meta} />
        {temTurno && (
          <div className="legenda">
            <span><i style={{ background: "var(--meu-turno)" }} />No seu turno</span>
            <span><i style={{ background: "var(--outro-turno)" }} />Em outro turno</span>
          </div>
        )}
        <details>
          <summary className="etiqueta" style={{ cursor: "pointer" }}>Ver os números dia a dia</summary>
          <div className="rolagem">
            <table>
              <thead>
                <tr>
                  <th>Dia</th>
                  {temTurno && <th className="num">No seu turno</th>}
                  {temTurno && <th className="num">Em outro turno</th>}
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {[...r.dias].reverse().map((d) => (
                  <tr key={d.dia}>
                    <td>{formatarDia(d.dia, true)}</td>
                    {temTurno && <td className="num">{d.meu}</td>}
                    {temTurno && <td className="num">{d.outro}</td>}
                    <td className="num">{d.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </>
  );
}
