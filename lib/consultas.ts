import type { criarClienteServidor } from "@/lib/supabase/server";
import type { LinhaContagem } from "@/lib/painel";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

// Busca as contagens diárias de uma pessoa num intervalo, de 1000 em 1000
// linhas (o limite padrão da API), para o "Geral" não cortar nada com o tempo.
export async function buscarContagens(
  supabase: Cliente,
  usuarioId: string,
  de?: string,
  ate?: string,
): Promise<{ linhas: LinhaContagem[]; erro: boolean }> {
  const linhas: LinhaContagem[] = [];
  const PAGINA = 1000;
  for (let inicio = 0; ; inicio += PAGINA) {
    let q = supabase
      .from("contagem_diaria")
      .select("dia, turno, total, origem")
      .eq("usuario_id", usuarioId)
      .order("dia", { ascending: true })
      .order("turno", { ascending: true })
      .range(inicio, inicio + PAGINA - 1);
    if (de) q = q.gte("dia", de);
    if (ate) q = q.lte("dia", ate);
    const { data, error } = await q;
    if (error) return { linhas, erro: true };
    linhas.push(...((data ?? []) as LinhaContagem[]));
    if (!data || data.length < PAGINA) break;
  }
  return { linhas, erro: false };
}

export async function primeiroDiaComDados(supabase: Cliente, usuarioId: string): Promise<string | null> {
  const { data } = await supabase
    .from("contagem_diaria")
    .select("dia")
    .eq("usuario_id", usuarioId)
    .order("dia", { ascending: true })
    .limit(1)
    .maybeSingle<{ dia: string }>();
  return data?.dia ?? null;
}
