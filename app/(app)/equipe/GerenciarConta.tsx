"use client";

import { useActionState } from "react";
import { alterarAtivo, alterarPapel, alterarTurno, gerarNovaSenha, type EstadoAcao } from "./acoes";
import SenhaGerada from "./SenhaGerada";
import { NOME_PAPEL, NOME_TURNO, TURNOS, type Papel, type Turno } from "@/lib/tempo";

type Alvo = { id: string; nome: string; papel: Papel; turno: Turno | null; ativo: boolean };

function Resultado({ estado }: { estado: EstadoAcao }) {
  if (estado.erro) return <p className="mensagem-erro" role="alert">{estado.erro}</p>;
  if (estado.ok && !estado.senha) return <p className="mensagem-ok">{estado.ok}</p>;
  return null;
}

export default function GerenciarConta({
  alvo,
  podeMudarTurno,
  papeisPossiveis,
}: {
  alvo: Alvo;
  podeMudarTurno: boolean;
  papeisPossiveis: Papel[];
}) {
  const [eSenha, aSenha, pSenha] = useActionState<EstadoAcao, FormData>(gerarNovaSenha, {});
  const [eAtivo, aAtivo, pAtivo] = useActionState<EstadoAcao, FormData>(alterarAtivo, {});
  const [eTurno, aTurno, pTurno] = useActionState<EstadoAcao, FormData>(alterarTurno, {});
  const [ePapel, aPapel, pPapel] = useActionState<EstadoAcao, FormData>(alterarPapel, {});

  return (
    <div style={{ display: "grid", gap: 12, padding: "8px 0" }}>
      <form action={aSenha} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input type="hidden" name="id" value={alvo.id} />
        <button type="submit" className="botao-secundario botao-pequeno" disabled={pSenha}>
          {pSenha ? "GERANDO..." : "GERAR NOVA SENHA"}
        </button>
        <span className="etiqueta">A senha atual deixa de funcionar.</span>
      </form>
      <Resultado estado={eSenha} />
      {eSenha.senha && eSenha.login && <SenhaGerada login={eSenha.login} senha={eSenha.senha} />}

      {podeMudarTurno && (
        <form action={aTurno} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input type="hidden" name="id" value={alvo.id} />
          <select name="turno" defaultValue={alvo.turno ?? ""} style={{ width: "auto" }} aria-label="Novo turno">
            {(alvo.papel === "supervisor_geral" || alvo.papel === "admin") && <option value="">Sem turno</option>}
            {TURNOS.map((t) => (
              <option key={t} value={t}>{NOME_TURNO[t]}</option>
            ))}
          </select>
          <button type="submit" className="botao-secundario botao-pequeno" disabled={pTurno}>
            MUDAR TURNO
          </button>
        </form>
      )}
      <Resultado estado={eTurno} />

      {papeisPossiveis.length > 1 && (
        <form action={aPapel} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input type="hidden" name="id" value={alvo.id} />
          <select name="papel" defaultValue={alvo.papel} style={{ width: "auto" }} aria-label="Novo papel">
            {papeisPossiveis.map((p) => (
              <option key={p} value={p}>{NOME_PAPEL[p]}</option>
            ))}
          </select>
          <button type="submit" className="botao-secundario botao-pequeno" disabled={pPapel}>
            MUDAR PAPEL
          </button>
        </form>
      )}
      <Resultado estado={ePapel} />

      <form action={aAtivo}>
        <input type="hidden" name="id" value={alvo.id} />
        <input type="hidden" name="ativo" value={alvo.ativo ? "false" : "true"} />
        <button type="submit" className="botao-secundario botao-pequeno" disabled={pAtivo}>
          {alvo.ativo ? "DESATIVAR CONTA" : "REATIVAR CONTA"}
        </button>
      </form>
      <Resultado estado={eAtivo} />
    </div>
  );
}
