"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { emailInterno, FORMATO_LOGIN } from "@/lib/tempo";

const MOTIVOS: Record<string, string> = {
  "sem-perfil": "Esta conta está desativada ou sem perfil. Fale com o seu supervisor.",
};

function FormularioLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(MOTIVOS[params.get("erro") ?? ""] ?? null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    const l = login.trim().toLowerCase();
    if (!FORMATO_LOGIN.test(l)) {
      setErro("Login inválido. Use só letras minúsculas, números, ponto, hífen ou sublinhado.");
      return;
    }
    setEnviando(true);
    setErro(null);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInterno(l),
      password: senha,
    });
    if (error) {
      setErro("Login ou senha incorretos.");
      setEnviando(false);
      return;
    }
    router.replace("/painel");
    router.refresh();
  }

  return (
    <form className="formulario" onSubmit={entrar} style={{ maxWidth: "none" }}>
      <label>
        Login
        <input
          name="login"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          required
        />
      </label>
      <label>
        Senha
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
      </label>
      {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
      <button type="submit" disabled={enviando}>
        {enviando ? "ENTRANDO..." : "ENTRAR"}
      </button>
    </form>
  );
}

export default function PaginaLogin() {
  return (
    <main className="tela-centro">
      <div className="caixa-login">
        <div>
          <div className="logo">CIOSP</div>
          <div className="sub">CONTADOR DE CHECAGENS</div>
        </div>
        <Suspense>
          <FormularioLogin />
        </Suspense>
        <p className="etiqueta" style={{ textAlign: "center" }}>
          Sem acesso? O login é criado pelo seu supervisor.
        </p>
      </div>
    </main>
  );
}
