import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Papel, Turno } from "@/lib/tempo";

export type Perfil = {
  id: string;
  login: string;
  nome: string;
  papel: Papel;
  turno: Turno | null;
  meta_diaria: number;
  ativo: boolean;
  trocar_senha: boolean;
};

// Carrega o perfil de quem está logado. Sem sessão vai para o login;
// sem perfil (ou desativado) a sessão é encerrada.
export async function carregarPerfil() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfis")
    .select("id, login, nome, papel, turno, meta_diaria, ativo, trocar_senha")
    .eq("id", user.id)
    .maybeSingle<Perfil>();

  if (!perfil || !perfil.ativo) redirect("/sair?motivo=sem-perfil");
  return { supabase, perfil };
}
