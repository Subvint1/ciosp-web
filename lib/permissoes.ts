import type { Papel, Turno } from "@/lib/tempo";

// Espelho das regras do banco, usado SÓ para decidir o que mostrar na tela.
// Quem decide de verdade são as funções pode_criar, pode_gerir e
// pode_mudar_turno no banco, chamadas de novo em cada ação.

export function papeisQuePodeCriar(meu: Papel): Papel[] {
  switch (meu) {
    case "admin":
      return ["operador", "supervisor_turno", "supervisor_geral", "admin"];
    case "supervisor_geral":
      return ["operador", "supervisor_turno"];
    case "supervisor_turno":
      return ["operador"];
    default:
      return [];
  }
}

export function podeCriar(meu: Papel, meuTurno: Turno | null, papel: Papel, turno: Turno | null) {
  if (meu === "admin") return true;
  if (meu === "supervisor_geral") return (papel === "operador" || papel === "supervisor_turno") && turno !== null;
  if (meu === "supervisor_turno") return papel === "operador" && turno === meuTurno;
  return false;
}

export function podeGerir(
  eu: { id: string; papel: Papel; turno: Turno | null },
  alvo: { id: string; papel: Papel; turno: Turno | null },
) {
  return alvo.id !== eu.id && podeCriar(eu.papel, eu.turno, alvo.papel, alvo.turno);
}

export function podeMudarTurno(meu: Papel) {
  return meu === "supervisor_geral" || meu === "admin";
}

export function precisaTurno(papel: Papel) {
  return papel === "operador" || papel === "supervisor_turno";
}
