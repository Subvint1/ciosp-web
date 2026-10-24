import Link from "next/link";
import { carregarPerfil } from "@/lib/perfil";
import { formatarDia, hojeCuiaba, HORARIO_TURNO, NOME_TURNO, TURNOS, turnoAgora, type Turno } from "@/lib/tempo";

export const dynamic = "force-dynamic";

type LinhaPlacar = {
  usuario_id: string;
  nome: string;
  turno_perfil: string | null;
  total_dia: number;
  total_mes: number;
};

export default async function PaginaTurno({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { supabase, perfil } = await carregarPerfil();
  const agora = turnoAgora();
  const hoje = hojeCuiaba();

  // Operador e supervisor de turno: o turno do perfil e o turno em que estão agora.
  // Supervisor geral e admin: todos. (O banco confere isso de novo.)
  const veTodos = perfil.papel === "supervisor_geral" || perfil.papel === "admin";
  const permitidos: Turno[] = veTodos
    ? TURNOS
    : TURNOS.filter((t) => t === perfil.turno || t === agora);

  const pedido = (await searchParams).t as Turno | undefined;
  const turno: Turno = pedido && permitidos.includes(pedido) ? pedido : agora;

  const { data, error } = await supabase.rpc("placar", { p_turno: turno });
  const linhas = (data ?? []) as LinhaPlacar[];
  const totalTurnoHoje = linhas.reduce((s, l) => s + l.total_dia, 0);
  const totalTurnoMes = linhas.reduce((s, l) => s + l.total_mes, 0);

  return (
    <>
      <h1>Placar do turno</h1>
      {permitidos.length > 1 && (
        <nav className="abas" aria-label="Turnos">
          {permitidos.map((t) => (
            <Link key={t} href={`/turno?t=${t}`} className={t === turno ? "ativa" : ""}>
              {NOME_TURNO[t]}
              {t === agora ? " (agora)" : ""}
            </Link>
          ))}
        </nav>
      )}

      <section className="cartao">
        <h2>
          {NOME_TURNO[turno]} · {HORARIO_TURNO[turno]} · {formatarDia(hoje, true)}
        </h2>
        <p className="etiqueta">
          Conta toda checagem feita nesse horário, de qualquer operador. Quem é de outro turno aparece
          com o turno do perfil ao lado do nome.
        </p>

        {error ? (
          <p className="mensagem-erro">Não foi possível carregar o placar.</p>
        ) : linhas.length === 0 ? (
          <p className="etiqueta">Nenhuma checagem neste turno ainda.</p>
        ) : (
          <div className="rolagem">
            <table>
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Nome</th>
                  <th className="num">Hoje</th>
                  <th className="num">No mês</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={l.usuario_id} className={l.usuario_id === perfil.id ? "eu" : ""}>
                    <td className="num">{i + 1}</td>
                    <td>
                      {l.nome}
                      {l.turno_perfil && l.turno_perfil !== turno && (
                        <span className="etiqueta"> · turno {NOME_TURNO[l.turno_perfil as Turno]}</span>
                      )}
                    </td>
                    <td className="num">{l.total_dia}</td>
                    <td className="num">{l.total_mes}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td />
                  <td><strong>Total do turno</strong></td>
                  <td className="num"><strong>{totalTurnoHoje}</strong></td>
                  <td className="num"><strong>{totalTurnoMes}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
