// Tudo de data e turno no fuso de Cuiabá, igual ao banco.
export const FUSO = "America/Cuiaba";

export type Turno = "madrugada" | "manha" | "tarde" | "noite";
export type Papel = "operador" | "supervisor_turno" | "supervisor_geral" | "admin";

export const TURNOS: Turno[] = ["madrugada", "manha", "tarde", "noite"];

export const NOME_TURNO: Record<Turno, string> = {
  madrugada: "Madrugada",
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

export const HORARIO_TURNO: Record<Turno, string> = {
  madrugada: "00h às 06h",
  manha: "06h às 12h",
  tarde: "12h às 18h",
  noite: "18h às 24h",
};

export const NOME_PAPEL: Record<Papel, string> = {
  operador: "Operador",
  supervisor_turno: "Supervisor de turno",
  supervisor_geral: "Supervisor geral",
  admin: "Admin",
};

// "2026-10-24" para o dia de hoje em Cuiabá.
export function hojeCuiaba(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

// Turno da hora atual, pela mesma regra do banco.
export function turnoAgora(agora: Date = new Date()): Turno {
  const h = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: FUSO,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(agora),
  );
  if (h < 6) return "madrugada";
  if (h < 12) return "manha";
  if (h < 18) return "tarde";
  return "noite";
}

// Soma dias a uma data "AAAA-MM-DD" sem passar por fuso.
export function somarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function inicioDoMes(dia: string): string {
  return `${dia.slice(0, 7)}-01`;
}

// "24/10" ou "24/10/2026".
export function formatarDia(dia: string, comAno = false): string {
  const [a, m, d] = dia.split("-");
  return comAno ? `${d}/${m}/${a}` : `${d}/${m}`;
}

// O login vira um e-mail interno só porque o Supabase exige e-mail.
export const DOMINIO_INTERNO = "ciosp.interno";
export const FORMATO_LOGIN = /^[a-z0-9._-]{3,30}$/;
export function emailInterno(login: string): string {
  return `${login.trim().toLowerCase()}@${DOMINIO_INTERNO}`;
}
