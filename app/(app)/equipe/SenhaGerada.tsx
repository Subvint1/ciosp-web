"use client";

import { useState } from "react";

// Mostra login e senha provisória UMA vez, com botão de copiar.
export default function SenhaGerada({ login, senha }: { login: string; senha: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    const texto = `Site: ${window.location.origin}\nLogin: ${login}\nSenha provisória: ${senha}`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="cartao" style={{ borderColor: "var(--texto)", gap: 8 }} role="status">
      <div className="etiqueta">Envie ao operador. Esta senha não aparece de novo.</div>
      <div>
        Login: <strong>{login}</strong>
      </div>
      <div>
        Senha provisória: <strong style={{ fontSize: 18, letterSpacing: "0.08em" }}>{senha}</strong>
      </div>
      <div>
        <button type="button" className="botao-secundario botao-pequeno" onClick={copiar}>
          {copiado ? "COPIADO" : "COPIAR LOGIN E SENHA"}
        </button>
      </div>
      <div className="etiqueta">No primeiro acesso o site pede para ele trocar a senha.</div>
    </div>
  );
}
