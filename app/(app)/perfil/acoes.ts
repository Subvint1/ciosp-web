"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoMeta = { ok?: string; erro?: string };

export async function salvarMeta(_anterior: EstadoMeta, dados: FormData): Promise<EstadoMeta> {
  const meta = Number(dados.get("meta"));
  if (!Number.isInteger(meta) || meta < 1 || meta > 2000) {
    return { erro: "A meta precisa ser um número inteiro entre 1 e 2000." };
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("definir_minha_meta", { p_meta: meta });
  if (error) return { erro: "Não foi possível salvar a meta." };
  revalidatePath("/", "layout");
  return { ok: `Meta diária salva: ${meta}.` };
}
