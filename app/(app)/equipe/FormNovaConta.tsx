"use client";

import { useActionState, useState } from "react";
import { criarConta, type EstadoAcao } from "./acoes";
import SenhaGerada from "./SenhaGerada";
import { NOME_PAPEL, NOME_TURNO, TURNOS, type Papel, type Turno } from "@/lib/tempo";
import { precisaTurno } from "@/lib/permissoes";

export default function FormNovaConta({
  papeis,
  turnoFixo,
}: {
  papeis: Papel[];
  turnoFixo: Turno | null; // supervisor de turno só cria no próprio turno
}) {
  const [estado, acao, enviando] = useActionState<EstadoAcao, FormData>(criarConta, {});
  const [papel, setPapel] = useState<Papel>(papeis[0]);
  const exigeTurno = precisaTurno(papel);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <form className="formulario" action={acao} style={{ maxWidth: 420 }}>
        <label>
          Nome
          <input name="nome" required maxLength={80} placeholder="Como aparece no placar" />
        </label>
        <label>
          Login
          <input
            name="login"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9._\-]{3,30}"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="ex.: joao.silva"
          />
        </label>
        <label>
          Papel
          <select name="papel" value={papel} onChange={(e) => setPapel(e.target.value as Papel)}>
            {papeis.map((p) => (
              <option key={p} value={p}>
                {NOME_PAPEL[p]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Turno do perfil
          {turnoFixo ? (
            <>
              <input value={NOME_TURNO[turnoFixo]} disabled />
              <input type="hidden" name="turno" value={turnoFixo} />
            </>
          ) : (
            <select name="turno" defaultValue={exigeTurno ? "tarde" : ""} key={String(exigeTurno)}>
              {!exigeTurno && <option value="">Sem turno</option>}
              {TURNOS.map((t) => (
                <option key={t} value={t}>
                  {NOME_TURNO[t]}
                </option>
              ))}
            </select>
          )}
        </label>
        {estado.erro && <p className="mensagem-erro" role="alert">{estado.erro}</p>}
        <button type="submit" disabled={enviando}>
          {enviando ? "CRIANDO..." : "CRIAR CONTA"}
        </button>
      </form>
      {estado.ok && estado.senha && estado.login && (
        <>
          <p className="mensagem-ok">{estado.ok}</p>
          <SenhaGerada login={estado.login} senha={estado.senha} />
        </>
      )}
    </div>
  );
}
