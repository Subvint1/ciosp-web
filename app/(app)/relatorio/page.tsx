import { redirect } from "next/navigation";
import { carregarPerfil } from "@/lib/perfil";
import { buscarContagens, primeiroDiaComDados } from "@/lib/consultas";
import { lerFiltros, membrosFiltrados, type Membro } from "@/lib/relatorio";
import { hojeCuiaba } from "@/lib/tempo";
import Relatorio from "./Relatorio";

export const dynamic = "force-dynamic";

export default async function PaginaRelatorio({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, perfil } = await carregarPerfil();
  if (perfil.papel === "operador") redirect("/historico");

  const hoje = hojeCuiaba();
  const params = await searchParams;

  // Quem esta pessoa pode ver (o banco filtra: supervisor de turno recebe só o turno dele).
  const { data } = await supabase.from("perfis").select("id, nome, login, papel, turno, meta_diaria, ativo");
  const todos = ((data ?? []) as Membro[]).sort((a, b) => a.nome.localeCompare(b.nome));

  const primeiro = (await primeiroDiaComDados(supabase)) ?? hoje;
  const f = lerFiltros(params, hoje, primeiro);
  const membros = membrosFiltrados(todos, f);

  const { linhas, erro } = await buscarContagens(supabase, {
    de: f.de,
    ate: f.ate,
    turno: f.turnoChecagem === "todos" ? undefined : f.turnoChecagem,
    usuarioId: membros.length === 1 ? membros[0].id : undefined,
  });

  return <Relatorio perfil={perfil} todos={todos} membros={membros} f={f} linhas={linhas} erro={erro} params={params} />;
}
