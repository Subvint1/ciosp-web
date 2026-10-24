import { inicioDoMes, somarDias, type Turno } from "@/lib/tempo";

// Uma linha da view contagem_diaria.
export type LinhaContagem = {
  dia: string;
  turno: Turno | null;
  total: number;
  origem: "extensao" | "importado";
};

export type Dia = { dia: string; meu: number; outro: number; total: number };

export type ResumoPainel = {
  dias: Dia[]; // últimos 30 dias, do mais antigo ao de hoje
  hoje: Dia;
  hojePorTurno: Partial<Record<Turno, number>>;
  totalMes: number;
  mediaDiasTrabalhados: number;
  diasTrabalhados: number;
  melhorDia: Dia | null;
};

// Separa "meu turno" de "outro turno" pelo turno do perfil.
// O histórico importado não tem hora, então conta como do próprio turno.
// Quem não tem turno no perfil (supervisor geral, admin) vê tudo como "meu".
export function montarResumo(
  linhas: LinhaContagem[],
  turnoPerfil: Turno | null,
  hoje: string,
): ResumoPainel {
  const porDia = new Map<string, Dia>();
  const hojePorTurno: Partial<Record<Turno, number>> = {};

  for (const l of linhas) {
    const d = porDia.get(l.dia) ?? { dia: l.dia, meu: 0, outro: 0, total: 0 };
    const doMeuTurno = l.origem === "importado" || !turnoPerfil || l.turno === turnoPerfil;
    if (doMeuTurno) d.meu += l.total;
    else d.outro += l.total;
    d.total += l.total;
    porDia.set(l.dia, d);
    if (l.dia === hoje && l.turno) {
      hojePorTurno[l.turno] = (hojePorTurno[l.turno] ?? 0) + l.total;
    }
  }

  const dias: Dia[] = [];
  for (let i = 29; i >= 0; i--) {
    const dia = somarDias(hoje, -i);
    dias.push(porDia.get(dia) ?? { dia, meu: 0, outro: 0, total: 0 });
  }

  const mes = inicioDoMes(hoje);
  let totalMes = 0;
  for (const d of porDia.values()) if (d.dia >= mes && d.dia <= hoje) totalMes += d.total;

  const trabalhados = dias.filter((d) => d.total > 0);
  const soma30 = trabalhados.reduce((s, d) => s + d.total, 0);
  const melhorDia = trabalhados.reduce<Dia | null>(
    (m, d) => (!m || d.total > m.total ? d : m),
    null,
  );

  return {
    dias,
    hoje: dias[dias.length - 1],
    hojePorTurno,
    totalMes,
    diasTrabalhados: trabalhados.length,
    mediaDiasTrabalhados: trabalhados.length ? Math.round(soma30 / trabalhados.length) : 0,
    melhorDia,
  };
}

// Primeiro dia que o painel precisa buscar: o mais antigo entre
// "30 dias atrás" e "início do mês".
export function inicioDaBusca(hoje: string): string {
  const trinta = somarDias(hoje, -29);
  const mes = inicioDoMes(hoje);
  return trinta < mes ? trinta : mes;
}
