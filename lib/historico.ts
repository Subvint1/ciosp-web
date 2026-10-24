import { inicioDoMes, somarDias, TURNOS, type Turno } from "@/lib/tempo";
import type { LinhaContagem } from "@/lib/painel";

export type Periodo =
  | { tipo: "mes"; mes: string } // "2026-09"
  | { tipo: "ano"; ano: string } // "2026"
  | { tipo: "geral" };

// Uma barra do gráfico: um dia (visão Mês) ou um mês (visões Ano e Geral).
export type Barra = { chave: string; rotulo: string; meu: number; outro: number; total: number };

export type ResumoPeriodo = {
  barras: Barra[];
  granularidade: "dia" | "mes";
  total: number;
  meu: number;
  outro: number;
  diasTrabalhados: number;
  mediaDiaTrabalhado: number;
  melhorDia: { dia: string; total: number } | null;
  melhorMes: { mes: string; total: number } | null;
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function nomeMes(mes: string, longo = false): string {
  const [a, m] = mes.split("-");
  const n = (longo ? MESES_LONGOS : MESES).at(Number(m) - 1);
  return longo ? `${n} de ${a}` : `${n}/${a.slice(2)}`;
}

function ultimoDiaDoMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
}

function proximoMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

// Lista de meses "AAAA-MM" de um mês a outro, inclusive.
export function mesesEntre(de: string, ate: string): string[] {
  const lista: string[] = [];
  for (let m = de; m <= ate; m = proximoMes(m)) lista.push(m);
  return lista;
}

// Primeiro e último dia que o período cobre (nunca passa de hoje).
export function intervalo(p: Periodo, primeiroDia: string, hoje: string): { de: string; ate: string } {
  const limitar = (d: string) => (d > hoje ? hoje : d);
  if (p.tipo === "mes") return { de: `${p.mes}-01`, ate: limitar(ultimoDiaDoMes(p.mes)) };
  if (p.tipo === "ano") return { de: `${p.ano}-01-01`, ate: limitar(`${p.ano}-12-31`) };
  return { de: primeiroDia, ate: hoje };
}

// Chaves das barras/pontos do período: dias (Mês) ou meses (Ano, Geral).
function chavesDoPeriodo(p: Periodo, de: string, ate: string) {
  if (p.tipo === "mes") {
    const lista: { chave: string; rotulo: string }[] = [];
    for (let d = de; d <= ate; d = somarDias(d, 1)) lista.push({ chave: d, rotulo: d.slice(8) });
    return { granularidade: "dia" as const, lista };
  }
  const lista = mesesEntre(inicioDoMes(de).slice(0, 7), ate.slice(0, 7)).map((m) => ({ chave: m, rotulo: nomeMes(m) }));
  return { granularidade: "mes" as const, lista };
}

// Regra individual: histórico importado conta como do próprio turno;
// sem turno no perfil, tudo conta como "meu".
export function classificarPessoa(turnoPerfil: Turno | null) {
  return (l: LinhaContagem) => l.origem === "importado" || !turnoPerfil || l.turno === turnoPerfil;
}

// Regra do total do turno: "meu" = feito por quem é da equipe (turno do perfil),
// "outro" = feito ali por operadores de outros turnos.
export function classificarEquipe(equipe: Set<string>) {
  return (l: LinhaContagem) => !!l.usuario_id && equipe.has(l.usuario_id);
}

export function resumirPeriodo(
  linhas: LinhaContagem[],
  ehMeu: (l: LinhaContagem) => boolean,
  p: Periodo,
  de: string,
  ate: string,
): ResumoPeriodo {
  const porDia = new Map<string, { meu: number; outro: number }>();
  for (const l of linhas) {
    if (l.dia < de || l.dia > ate) continue;
    const d = porDia.get(l.dia) ?? { meu: 0, outro: 0 };
    if (ehMeu(l)) d.meu += l.total;
    else d.outro += l.total;
    porDia.set(l.dia, d);
  }

  const { granularidade, lista } = chavesDoPeriodo(p, de, ate);
  const porChave = new Map<string, { meu: number; outro: number }>();
  for (const [dia, v] of porDia) {
    const k = granularidade === "dia" ? dia : dia.slice(0, 7);
    const acc = porChave.get(k) ?? { meu: 0, outro: 0 };
    acc.meu += v.meu;
    acc.outro += v.outro;
    porChave.set(k, acc);
  }
  const barras: Barra[] = lista.map(({ chave, rotulo }) => {
    const v = porChave.get(chave) ?? { meu: 0, outro: 0 };
    return { chave, rotulo, meu: v.meu, outro: v.outro, total: v.meu + v.outro };
  });

  let meu = 0, outro = 0, diasTrabalhados = 0;
  let melhorDia: ResumoPeriodo["melhorDia"] = null;
  for (const [dia, v] of porDia) {
    const t = v.meu + v.outro;
    meu += v.meu;
    outro += v.outro;
    if (t > 0) diasTrabalhados++;
    if (t > 0 && (!melhorDia || t > melhorDia.total)) melhorDia = { dia, total: t };
  }
  const melhorMes =
    granularidade === "mes"
      ? barras.reduce<ResumoPeriodo["melhorMes"]>(
          (m, b) => (b.total > 0 && (!m || b.total > m.total) ? { mes: b.chave, total: b.total } : m),
          null,
        )
      : null;

  return {
    barras,
    granularidade,
    total: meu + outro,
    meu,
    outro,
    diasTrabalhados,
    mediaDiaTrabalhado: diasTrabalhados ? Math.round((meu + outro) / diasTrabalhados) : 0,
    melhorDia,
    melhorMes,
  };
}

// Total por pessoa no período (para a tabela do total do turno).
export function totalPorPessoa(linhas: LinhaContagem[], de: string, ate: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of linhas) {
    if (!l.usuario_id || l.dia < de || l.dia > ate) continue;
    m.set(l.usuario_id, (m.get(l.usuario_id) ?? 0) + l.total);
  }
  return m;
}

// ---------------------------------------------------------------------
// Comparação entre turnos (pelo turno da hora da checagem;
// o histórico importado entra no turno do perfil de quem fez).
// ---------------------------------------------------------------------
export type PontoComparacao = { chave: string; rotulo: string; valores: Record<Turno, number> };
export type LinhaTurno = {
  turno: Turno;
  total: number;
  parcela: number; // 0..1 do total geral do período
  diasComChecagem: number;
  mediaPorDia: number;
};
export type Comparacao = {
  granularidade: "dia" | "mes";
  pontos: PontoComparacao[];
  turnos: LinhaTurno[];
  totalGeral: number;
};

const zeros = (): Record<Turno, number> => ({ madrugada: 0, manha: 0, tarde: 0, noite: 0 });

export function compararTurnos(linhas: LinhaContagem[], p: Periodo, de: string, ate: string): Comparacao {
  const { granularidade, lista } = chavesDoPeriodo(p, de, ate);
  const porChave = new Map<string, Record<Turno, number>>();
  const diasPorTurno: Record<Turno, Set<string>> = {
    madrugada: new Set(), manha: new Set(), tarde: new Set(), noite: new Set(),
  };
  const totais = zeros();

  for (const l of linhas) {
    if (!l.turno || l.dia < de || l.dia > ate || l.total <= 0) continue;
    const k = granularidade === "dia" ? l.dia : l.dia.slice(0, 7);
    const v = porChave.get(k) ?? zeros();
    v[l.turno] += l.total;
    porChave.set(k, v);
    totais[l.turno] += l.total;
    diasPorTurno[l.turno].add(l.dia);
  }

  const totalGeral = TURNOS.reduce((s, t) => s + totais[t], 0);
  return {
    granularidade,
    pontos: lista.map(({ chave, rotulo }) => ({ chave, rotulo, valores: porChave.get(chave) ?? zeros() })),
    turnos: TURNOS.map((t) => ({
      turno: t,
      total: totais[t],
      parcela: totalGeral ? totais[t] / totalGeral : 0,
      diasComChecagem: diasPorTurno[t].size,
      mediaPorDia: diasPorTurno[t].size ? Math.round(totais[t] / diasPorTurno[t].size) : 0,
    })),
    totalGeral,
  };
}

// Lê o período da URL, com padrão seguro: mês atual.
export function lerPeriodo(params: { p?: string; m?: string; a?: string }, hoje: string): Periodo {
  if (params.p === "geral") return { tipo: "geral" };
  if (params.p === "ano" && /^\d{4}$/.test(params.a ?? "")) return { tipo: "ano", ano: params.a! };
  if (params.p === "ano") return { tipo: "ano", ano: hoje.slice(0, 4) };
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(params.m ?? "")) return { tipo: "mes", mes: params.m! };
  return { tipo: "mes", mes: hoje.slice(0, 7) };
}
