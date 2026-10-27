import { somarDias, TURNOS, type Papel, type Turno } from "@/lib/tempo";
import { nomeMes } from "@/lib/historico";
import type { LinhaContagem } from "@/lib/painel";

// ---------------------------------------------------------------------
// Filtros do relatório (todos vêm da URL, para o link poder ser compartilhado)
// ---------------------------------------------------------------------
export type Preset = "hoje" | "7d" | "30d" | "mes" | "mes_passado" | "ano" | "tudo" | "personalizado";
export type Agrupar = "dia" | "semana" | "mes";
export type Ordem = "checagens" | "nome" | "media" | "dias";

export type Filtros = {
  preset: Preset;
  de: string;
  ate: string;
  turnoPerfil: Turno | "todos";
  turnoChecagem: Turno | "todos";
  pessoas: string[]; // vazio = todas
  papel: "todos" | "operador" | "supervisao";
  origem: "todas" | "extensao" | "importado";
  situacao: "ativos" | "todos";
  agrupar: Agrupar;
  meta: number | null; // null = calcular pela meta diária média
  ordem: Ordem;
};

export const NOME_PRESET: Record<Preset, string> = {
  hoje: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  mes: "Este mês",
  mes_passado: "Mês passado",
  ano: "Este ano",
  tudo: "Todo o período",
  personalizado: "Personalizado",
};

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const um = <T extends string>(v: string | string[] | undefined, validos: readonly T[], padrao: T): T => {
  const s = Array.isArray(v) ? v[0] : v;
  return (validos as readonly string[]).includes(s ?? "") ? (s as T) : padrao;
};

export function intervaloDoPreset(preset: Preset, hoje: string, primeiroDia: string): { de: string; ate: string } {
  switch (preset) {
    case "hoje": return { de: hoje, ate: hoje };
    case "7d": return { de: somarDias(hoje, -6), ate: hoje };
    case "30d": return { de: somarDias(hoje, -29), ate: hoje };
    case "mes": return { de: `${hoje.slice(0, 7)}-01`, ate: hoje };
    case "mes_passado": {
      const fimAnterior = somarDias(`${hoje.slice(0, 7)}-01`, -1);
      return { de: `${fimAnterior.slice(0, 7)}-01`, ate: fimAnterior };
    }
    case "ano": return { de: `${hoje.slice(0, 4)}-01-01`, ate: hoje };
    default: return { de: primeiroDia, ate: hoje };
  }
}

export function lerFiltros(
  p: Record<string, string | string[] | undefined>,
  hoje: string,
  primeiroDia: string,
): Filtros {
  let preset = um(p.periodo, ["hoje", "7d", "30d", "mes", "mes_passado", "ano", "tudo", "personalizado"] as const, "tudo");
  let { de, ate } = intervaloDoPreset(preset, hoje, primeiroDia);
  const deP = Array.isArray(p.de) ? p.de[0] : p.de;
  const ateP = Array.isArray(p.ate) ? p.ate[0] : p.ate;
  if (preset === "personalizado" && deP && ateP && DATA.test(deP) && DATA.test(ateP)) {
    de = deP <= ateP ? deP : ateP;
    ate = deP <= ateP ? ateP : deP;
    if (ate > hoje) ate = hoje;
  } else if (preset === "personalizado") {
    preset = "tudo";
  }
  const pessoas = (Array.isArray(p.pessoa) ? p.pessoa : p.pessoa ? [p.pessoa] : []).filter((x) => /^[0-9a-f-]{36}$/i.test(x));
  const metaTxt = Array.isArray(p.meta) ? p.meta[0] : p.meta;
  const meta = metaTxt && /^\d{1,6}$/.test(metaTxt) && Number(metaTxt) > 0 ? Number(metaTxt) : null;
  const turnos = ["todos", ...TURNOS] as const;
  return {
    preset,
    de,
    ate,
    turnoPerfil: um(p.tperfil, turnos, "todos"),
    turnoChecagem: um(p.tcheck, turnos, "todos"),
    pessoas,
    papel: um(p.papel, ["todos", "operador", "supervisao"] as const, "todos"),
    origem: um(p.origem, ["todas", "extensao", "importado"] as const, "todas"),
    situacao: um(p.situacao, ["ativos", "todos"] as const, "todos"),
    agrupar: um(p.agrupar, ["dia", "semana", "mes"] as const, "mes"),
    meta,
    ordem: um(p.ordem, ["checagens", "nome", "media", "dias"] as const, "checagens"),
  };
}

// ---------------------------------------------------------------------
// Aplicação dos filtros
// ---------------------------------------------------------------------
export type Membro = {
  id: string;
  nome: string;
  login: string;
  papel: Papel;
  turno: Turno | null;
  meta_diaria: number;
  ativo: boolean;
};

export function membrosFiltrados(membros: Membro[], f: Filtros): Membro[] {
  return membros.filter((m) => {
    if (f.situacao === "ativos" && !m.ativo) return false;
    if (f.turnoPerfil !== "todos" && m.turno !== f.turnoPerfil) return false;
    if (f.papel === "operador" && m.papel !== "operador") return false;
    if (f.papel === "supervisao" && m.papel === "operador") return false;
    if (f.pessoas.length && !f.pessoas.includes(m.id)) return false;
    return true;
  });
}

// Mantém só as linhas das pessoas filtradas, dentro do período e dos demais filtros.
export function linhasFiltradas(linhas: LinhaContagem[], membros: Membro[], f: Filtros): LinhaContagem[] {
  const ids = new Set(membros.map((m) => m.id));
  return linhas.filter(
    (l) =>
      !!l.usuario_id &&
      ids.has(l.usuario_id) &&
      l.dia >= f.de &&
      l.dia <= f.ate &&
      l.total > 0 &&
      (f.turnoChecagem === "todos" || l.turno === f.turnoChecagem) &&
      (f.origem === "todas" || l.origem === f.origem),
  );
}

// ---------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------
export type LinhaRanking = {
  id: string;
  nome: string;
  turno: Turno | null;
  ativo: boolean;
  total: number;
  dias: number;
  media: number;
  parcela: number;
};

export function ranking(linhas: LinhaContagem[], membros: Membro[], ordem: Ordem): LinhaRanking[] {
  const total = new Map<string, number>();
  const dias = new Map<string, Set<string>>();
  for (const l of linhas) {
    const id = l.usuario_id!;
    total.set(id, (total.get(id) ?? 0) + l.total);
    if (!dias.has(id)) dias.set(id, new Set());
    dias.get(id)!.add(l.dia);
  }
  const soma = [...total.values()].reduce((s, v) => s + v, 0);
  const lista = membros
    .filter((m) => total.has(m.id))
    .map((m) => {
      const t = total.get(m.id)!;
      const d = dias.get(m.id)!.size;
      return { id: m.id, nome: m.nome, turno: m.turno, ativo: m.ativo, total: t, dias: d, media: Math.round(t / d), parcela: soma ? t / soma : 0 };
    });
  const comparar: Record<Ordem, (a: LinhaRanking, b: LinhaRanking) => number> = {
    checagens: (a, b) => b.total - a.total || a.nome.localeCompare(b.nome),
    media: (a, b) => b.media - a.media || b.total - a.total,
    dias: (a, b) => b.dias - a.dias || b.total - a.total,
    nome: (a, b) => a.nome.localeCompare(b.nome),
  };
  return lista.sort(comparar[ordem]);
}

export type Indicadores = {
  total: number;
  pessoas: number;
  mediaPorPessoa: number;
  diasComChecagem: number;
  mediaPorDia: number;
  melhorDia: { dia: string; total: number } | null;
};

export function indicadores(linhas: LinhaContagem[]): Indicadores {
  const porDia = new Map<string, number>();
  const pessoas = new Set<string>();
  let total = 0;
  for (const l of linhas) {
    total += l.total;
    pessoas.add(l.usuario_id!);
    porDia.set(l.dia, (porDia.get(l.dia) ?? 0) + l.total);
  }
  let melhorDia: Indicadores["melhorDia"] = null;
  for (const [dia, t] of porDia) if (!melhorDia || t > melhorDia.total) melhorDia = { dia, total: t };
  return {
    total,
    pessoas: pessoas.size,
    mediaPorPessoa: pessoas.size ? Math.round(total / pessoas.size) : 0,
    diasComChecagem: porDia.size,
    mediaPorDia: porDia.size ? Math.round(total / porDia.size) : 0,
    melhorDia,
  };
}

// Segunda-feira da semana de um dia "AAAA-MM-DD".
export function inicioDaSemana(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay(); // 0 = domingo
  return somarDias(dia, dow === 0 ? -6 : 1 - dow);
}

function chaveDoGrupo(dia: string, agrupar: Agrupar): string {
  return agrupar === "dia" ? dia : agrupar === "semana" ? inicioDaSemana(dia) : dia.slice(0, 7);
}

function rotuloDoGrupo(chave: string, agrupar: Agrupar): string {
  if (agrupar === "mes") return nomeMes(chave);
  const [, m, d] = chave.split("-");
  return `${d}/${m}`;
}

export type Serie = { id: string; nome: string; valores: number[] };
export type SerieAgrupada = { grupos: { chave: string; rotulo: string }[]; series: Serie[] };

// Uma barra por pessoa em cada grupo (dia, semana ou mês).
// Mostra as "maximo" pessoas com mais checagens; o resto vira "Outros".
export function serieAgrupada(
  linhas: LinhaContagem[],
  rank: LinhaRanking[],
  agrupar: Agrupar,
  de: string,
  ate: string,
  maximo = 8,
): SerieAgrupada {
  const chaves: string[] = [];
  for (let d = de; d <= ate; d = somarDias(d, 1)) {
    const k = chaveDoGrupo(d, agrupar);
    if (chaves.at(-1) !== k) chaves.push(k);
  }
  // Só os grupos que têm dados nas pontas (evita meses vazios antes do 1º registro).
  const comDados = new Set(linhas.map((l) => chaveDoGrupo(l.dia, agrupar)));
  let ini = 0, fim = chaves.length - 1;
  while (ini < fim && !comDados.has(chaves[ini])) ini++;
  while (fim > ini && !comDados.has(chaves[fim])) fim--;
  const grupos = chaves.slice(ini, fim + 1);
  const pos = new Map(grupos.map((k, i) => [k, i]));

  const ordem = [...rank].sort((a, b) => b.total - a.total);
  const principais = ordem.slice(0, maximo);
  const principaisIds = new Set(principais.map((r) => r.id));
  const series: Serie[] = principais.map((r) => ({ id: r.id, nome: r.nome, valores: grupos.map(() => 0) }));
  const idx = new Map(series.map((s, i) => [s.id, i]));
  const outros: Serie = { id: "outros", nome: "Outros", valores: grupos.map(() => 0) };

  for (const l of linhas) {
    const g = pos.get(chaveDoGrupo(l.dia, agrupar));
    if (g === undefined) continue;
    if (principaisIds.has(l.usuario_id!)) series[idx.get(l.usuario_id!)!].valores[g] += l.total;
    else outros.valores[g] += l.total;
  }
  if (outros.valores.some((v) => v > 0)) series.push(outros);
  return { grupos: grupos.map((chave) => ({ chave, rotulo: rotuloDoGrupo(chave, agrupar) })), series };
}

export function porTurno(linhas: LinhaContagem[]): Record<Turno, number> {
  const r: Record<Turno, number> = { madrugada: 0, manha: 0, tarde: 0, noite: 0 };
  for (const l of linhas) if (l.turno) r[l.turno] += l.total;
  return r;
}

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Média por dia da semana (só conta os dias em que houve checagem).
export function porDiaDaSemana(linhas: LinhaContagem[]): { total: number[]; media: number[] } {
  const porDia = new Map<string, number>();
  for (const l of linhas) porDia.set(l.dia, (porDia.get(l.dia) ?? 0) + l.total);
  const total = [0, 0, 0, 0, 0, 0, 0];
  const qtd = [0, 0, 0, 0, 0, 0, 0];
  for (const [dia, t] of porDia) {
    const [a, m, d] = dia.split("-").map(Number);
    const w = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
    total[w] += t;
    qtd[w]++;
  }
  return { total, media: total.map((t, i) => (qtd[i] ? Math.round(t / qtd[i]) : 0)) };
}

// Meta de referência do gráfico, na mesma unidade dos grupos.
// Padrão: meta diária média das pessoas × dias úteis (1 por dia, 5 por semana, 22 por mês).
export const DIAS_UTEIS: Record<Agrupar, number> = { dia: 1, semana: 5, mes: 22 };
export function metaDeReferencia(membros: Membro[], f: Filtros): { valor: number; calculada: boolean } | null {
  if (f.meta) return { valor: f.meta, calculada: false };
  if (!membros.length) return null;
  const media = membros.reduce((s, m) => s + m.meta_diaria, 0) / membros.length;
  return { valor: Math.round(media * DIAS_UTEIS[f.agrupar]), calculada: true };
}
