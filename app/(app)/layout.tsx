import Link from "next/link";
import { redirect } from "next/navigation";
import { carregarPerfil } from "@/lib/perfil";
import { NOME_PAPEL, NOME_TURNO } from "@/lib/tempo";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { perfil } = await carregarPerfil();
  if (perfil.trocar_senha) redirect("/trocar-senha");

  return (
    <>
      <header className="topo">
        <Link href="/painel" className="marca">
          CIOSP
        </Link>
        <nav className="nav" aria-label="Principal">
          <Link href="/painel">Meu painel</Link>
          <Link href="/historico">Histórico</Link>
          <Link href="/turno">Placar do turno</Link>
          {perfil.papel !== "operador" && <Link href="/equipe">Equipe</Link>}
          <Link href="/perfil">Perfil</Link>
        </nav>
        <div className="quem">
          <span>
            {perfil.nome} · {NOME_PAPEL[perfil.papel]}
            {perfil.turno ? ` · ${NOME_TURNO[perfil.turno]}` : ""}
          </span>
          <a href="/sair" className="botao botao-secundario botao-pequeno">
            SAIR
          </a>
        </div>
      </header>
      <main className="conteudo">{children}</main>
    </>
  );
}
