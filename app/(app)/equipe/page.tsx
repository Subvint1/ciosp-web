import { redirect } from "next/navigation";
import { carregarPerfil } from "@/lib/perfil";
import { papeisQuePodeCriar, podeCriar, podeGerir, podeMudarTurno } from "@/lib/permissoes";
import { NOME_PAPEL, NOME_TURNO, TURNOS, type Papel, type Turno } from "@/lib/tempo";
import FormNovaConta from "./FormNovaConta";
import GerenciarConta from "./GerenciarConta";

export const dynamic = "force-dynamic";

type Membro = {
  id: string;
  login: string;
  nome: string;
  papel: Papel;
  turno: Turno | null;
  ativo: boolean;
  trocar_senha: boolean;
};

const ORDEM_PAPEL: Record<Papel, number> = {
  admin: 0,
  supervisor_geral: 1,
  supervisor_turno: 2,
  operador: 3,
};

export default async function PaginaEquipe() {
  const { supabase, perfil } = await carregarPerfil();
  if (perfil.papel === "operador") redirect("/painel");

  // O banco só devolve quem esta pessoa pode ver.
  const { data, error } = await supabase
    .from("perfis")
    .select("id, login, nome, papel, turno, ativo, trocar_senha");
  const membros = ((data ?? []) as Membro[]).sort(
    (a, b) => ORDEM_PAPEL[a.papel] - ORDEM_PAPEL[b.papel] || a.nome.localeCompare(b.nome),
  );

  const papeis = papeisQuePodeCriar(perfil.papel);
  const mudaTurno = podeMudarTurno(perfil.papel);
  const grupos: { titulo: string; lista: Membro[] }[] = [
    ...TURNOS.map((t) => ({ titulo: NOME_TURNO[t], lista: membros.filter((m) => m.turno === t) })),
    { titulo: "Sem turno", lista: membros.filter((m) => m.turno === null) },
  ].filter((g) => g.lista.length > 0);

  return (
    <>
      <h1>Equipe</h1>

      <section className="cartao">
        <h2>Nova conta</h2>
        <FormNovaConta
          papeis={papeis}
          turnoFixo={perfil.papel === "supervisor_turno" ? perfil.turno : null}
        />
      </section>

      {error && <p className="mensagem-erro">Não foi possível carregar a equipe.</p>}

      {grupos.map((g) => (
        <section className="cartao" key={g.titulo}>
          <h2>
            {g.titulo} · {g.lista.filter((m) => m.ativo).length} ativos
          </h2>
          <div className="rolagem">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Login</th>
                  <th>Papel</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {g.lista.map((m) => {
                  const gerencia = podeGerir(perfil, m);
                  const papeisPossiveis = papeis.filter((p) => podeCriar(perfil.papel, perfil.turno, p, m.turno));
                  return (
                    <tr key={m.id} className={m.id === perfil.id ? "eu" : ""} style={{ opacity: m.ativo ? 1 : 0.55 }}>
                      <td style={{ verticalAlign: "top" }}>
                        {m.nome}
                        {gerencia && (
                          <details>
                            <summary className="etiqueta" style={{ cursor: "pointer" }}>Gerenciar</summary>
                            <GerenciarConta
                              alvo={m}
                              podeMudarTurno={mudaTurno}
                              papeisPossiveis={papeisPossiveis}
                            />
                          </details>
                        )}
                      </td>
                      <td style={{ verticalAlign: "top" }}>{m.login}</td>
                      <td style={{ verticalAlign: "top" }}>{NOME_PAPEL[m.papel]}</td>
                      <td style={{ verticalAlign: "top" }}>
                        {!m.ativo ? "Desativada" : m.trocar_senha ? "Aguardando 1º acesso" : "Ativa"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
