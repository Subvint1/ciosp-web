"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";

// Troca de senha. No primeiro acesso ("obrigatoria") leva ao painel depois.
export default function TrocarSenha({ obrigatoria = false }: { obrigatoria?: boolean }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setOk(false);
    if (senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As duas senhas não são iguais.");
      return;
    }
    setEnviando(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setErro(
        error.message.includes("different")
          ? "A nova senha precisa ser diferente da atual."
          : "Não foi possível trocar a senha. Tente de novo.",
      );
      setEnviando(false);
      return;
    }
    await supabase.rpc("concluir_troca_senha");
    setSenha("");
    setConfirmacao("");
    setEnviando(false);
    if (obrigatoria) {
      router.replace("/painel");
      router.refresh();
    } else {
      setOk(true);
    }
  }

  return (
    <form className="formulario" onSubmit={salvar}>
      <label>
        Nova senha
        <input
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
      </label>
      <label>
        Repita a nova senha
        <input
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          required
        />
      </label>
      {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
      {ok && <p className="mensagem-ok">Senha trocada.</p>}
      <button type="submit" disabled={enviando}>
        {enviando ? "SALVANDO..." : "SALVAR SENHA"}
      </button>
    </form>
  );
}
