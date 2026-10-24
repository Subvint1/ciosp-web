"use client";

import { useActionState } from "react";
import { salvarMeta, type EstadoMeta } from "./acoes";

export default function FormMeta({ metaAtual }: { metaAtual: number }) {
  const [estado, acao, salvando] = useActionState<EstadoMeta, FormData>(salvarMeta, {});
  return (
    <form className="formulario" action={acao}>
      <label>
        Meta diária de checagens
        <input name="meta" type="number" min={1} max={2000} step={1} defaultValue={metaAtual} required />
      </label>
      {estado.erro && <p className="mensagem-erro" role="alert">{estado.erro}</p>}
      {estado.ok && <p className="mensagem-ok">{estado.ok}</p>}
      <button type="submit" disabled={salvando}>
        {salvando ? "SALVANDO..." : "SALVAR META"}
      </button>
    </form>
  );
}
