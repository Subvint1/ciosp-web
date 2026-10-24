import { carregarPerfil } from "@/lib/perfil";
import { HORARIO_TURNO, NOME_PAPEL, NOME_TURNO } from "@/lib/tempo";
import TrocarSenha from "@/components/TrocarSenha";
import FormMeta from "./FormMeta";

export default async function PaginaPerfil() {
  const { perfil } = await carregarPerfil();

  return (
    <>
      <h1>Perfil</h1>
      <section className="cartao">
        <h2>Seus dados</h2>
        <table>
          <tbody>
            <tr><th>Nome</th><td>{perfil.nome}</td></tr>
            <tr><th>Login</th><td>{perfil.login}</td></tr>
            <tr><th>Papel</th><td>{NOME_PAPEL[perfil.papel]}</td></tr>
            <tr>
              <th>Turno do perfil</th>
              <td>
                {perfil.turno ? `${NOME_TURNO[perfil.turno]} (${HORARIO_TURNO[perfil.turno]})` : "Sem turno"}
                <div className="etiqueta">
                  Só identifica você. Cada checagem conta no turno da hora em que foi feita.
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="etiqueta">Nome, login, papel e turno são alterados pela supervisão.</p>
      </section>

      <section className="cartao">
        <h2>Meta</h2>
        <FormMeta metaAtual={perfil.meta_diaria} />
      </section>

      <section className="cartao">
        <h2>Trocar senha</h2>
        <TrocarSenha />
      </section>
    </>
  );
}
