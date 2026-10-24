import { inicioDoMes, somarDias, type Turno } from "@/lib/tempo";
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

// Mesma regra do painel: histórico importado conta como do próprio turno;
// sem turno no perfil, tudo conta como "meu".
function doMeuTurno(l: LinhaContagem, turnoPerfil: Turno | null) {
  return l.origem === "importado" || !turnoPerfil || l.turno === turnoPerfil;
}

export function resumirPeriodo(
  linhas: LinhaContagem[],
  turnoPerfil: Turno | null,
  p: Periodo,
  de: string,
  ate: string,
): ResumoPeriodo {
  const porDia = new Map<string, { meu: number; outro: number }>();
  for (const l of linhas) {
    if (l.dia < de || l.dia > ate) continue;
    const d = porDia.get(l.dia) ?? { meu: 0, outro: 0 };
    if (doMeuTurno(l, turnoPerfil)) d.meu += l.total;
    else d.outro += l.total;
    porDia.set(l.dia, d);
  }

  const granularidade = p.tipo === "mes" ? "dia" : "mes";
  const barras: Barra[] = [];
  if (granularidade === "dia") {
    for (let d = de; d <= ate; d = somarDias(d, 1)) {
      const v = porDia.get(d) ?? { meu: 0, outro: 0 };
      barras.push({ chave: d, rotulo: d.slice(8), meu: v.meu, outro: v.outro, total: v.meu + v.outro });
    }
  } else {
    const porMes = new Map<string, { meu: number; outro: number }>();
    for (const [dia, v] of porDia) {
      const m = dia.slice(0, 7);
      const acc = porMes.get(m) ?? { meu: 0, outro: 0 };
      acc.meu += v.meu;
      acc.outro += v.outro;
      porMes.set(m, acc);
    }
    for (const m of mesesEntre(inicioDoMes(de).slice(0, 7), ate.slice(0, 7))) {
      const v = porMes.get(m) ?? { meu: 0, outro: 0 };
      barras.push({ chave: m, rotulo: nomeMes(m), meu: v.meu, outro: v.outro, total: v.meu + v.outro });
    }
  }

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

// Lê o período da URL, com padrão seguro: mês atual.
export function lerPeriodo(
  params: { p?: string; m?: string; a?: string },
  hoje: string,
): Periodo {
  if (params.p === "geral") return { tipo: "geral" };
  if (params.p === "ano" && /^\d{4}$/.test(params.a ?? "")) return { tipo: "ano", ano: params.a! };
  if (params.p === "ano") return { tipo: "ano", ano: hoje.slice(0, 4) };
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(params.m ?? "")) return { tipo: "mes", mes: params.m! };
  return { tipo: "mes", mes: hoje.slice(0, 7) };
}
