import type { criarClienteServidor } from "@/lib/supabase/server";
import type { LinhaContagem } from "@/lib/painel";
import type { Turno } from "@/lib/tempo";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

export type Filtro = { usuarioId?: string; turno?: Turno; de?: string; ate?: string };

// Busca contagens diárias (de uma pessoa, de um turno ou de tudo que a
// pessoa logada pode ver), de 1000 em 1000 linhas, o limite padrão da API.
// O banco aplica as regras de acesso: o filtro aqui só escolhe o recorte.
export async function buscarContagens(
  supabase: Cliente,
  filtro: Filtro,
): Promise<{ linhas: LinhaContagem[]; erro: boolean }> {
  const linhas: LinhaContagem[] = [];
  const PAGINA = 1000;
  for (let inicio = 0; ; inicio += PAGINA) {
    let q = supabase
      .from("contagem_diaria")
      .select("usuario_id, dia, turno, total, origem")
      .order("dia", { ascending: true })
      .order("usuario_id", { ascending: true })
      .order("turno", { ascending: true })
      .range(inicio, inicio + PAGINA - 1);
    if (filtro.usuarioId) q = q.eq("usuario_id", filtro.usuarioId);
    if (filtro.turno) q = q.eq("turno", filtro.turno);
    if (filtro.de) q = q.gte("dia", filtro.de);
    if (filtro.ate) q = q.lte("dia", filtro.ate);
    const { data, error } = await q;
    if (error) return { linhas, erro: true };
    linhas.push(...((data ?? []) as LinhaContagem[]));
    if (!data || data.length < PAGINA) break;
  }
  return { linhas, erro: false };
}

export async function primeiroDiaComDados(supabase: Cliente, filtro: Filtro = {}): Promise<string | null> {
  let q = supabase.from("contagem_diaria").select("dia").order("dia", { ascending: true }).limit(1);
  if (filtro.usuarioId) q = q.eq("usuario_id", filtro.usuarioId);
  if (filtro.turno) q = q.eq("turno", filtro.turno);
  const { data } = await q.maybeSingle<{ dia: string }>();
  return data?.dia ?? null;
}
