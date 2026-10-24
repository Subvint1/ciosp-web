import { redirect } from "next/navigation";
import { carregarPerfil } from "@/lib/perfil";
import TrocarSenha from "@/components/TrocarSenha";

export default async function PaginaTrocarSenha() {
  const { perfil } = await carregarPerfil();
  if (!perfil.trocar_senha) redirect("/painel");

  return (
    <main className="tela-centro">
      <div className="caixa-login">
        <div>
          <div className="logo">CIOSP</div>
          <div className="sub">PRIMEIRO ACESSO</div>
        </div>
        <p>
          Olá, {perfil.nome}. A senha que você recebeu é provisória. Escolha uma senha sua para
          continuar.
        </p>
        <TrocarSenha obrigatoria />
        <a href="/sair" className="etiqueta" style={{ textAlign: "center" }}>
          Sair
        </a>
      </div>
    </main>
  );
}
