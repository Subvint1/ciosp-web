"use server";

import { revalidatePath } from "next/cache";
import { carregarPerfil } from "@/lib/perfil";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { gerarSenhaProvisoria } from "@/lib/senha";
import { precisaTurno } from "@/lib/permissoes";
import { emailInterno, FORMATO_LOGIN, TURNOS, type Papel, type Turno } from "@/lib/tempo";

export type EstadoAcao = { ok?: string; erro?: string; senha?: string; login?: string };

const PAPEIS: Papel[] = ["operador", "supervisor_turno", "supervisor_geral", "admin"];
const SEM_PERMISSAO: EstadoAcao = { erro: "Você não tem permissão para isso." };
const FALHA: EstadoAcao = { erro: "Não foi possível concluir. Tente de novo." };
const SEM_CHAVE: EstadoAcao = {
  erro: "Falta configurar a chave SUPABASE_SERVICE_ROLE_KEY no servidor (Netlify).",
};

function lerTurno(v: FormDataEntryValue | null): Turno | null {
  const s = String(v ?? "");
  return (TURNOS as string[]).includes(s) ? (s as Turno) : null;
}

function lerPapel(v: FormDataEntryValue | null): Papel | null {
  const s = String(v ?? "");
  return (PAPEIS as string[]).includes(s) ? (s as Papel) : null;
}

// Pergunta ao banco, com a sessão de quem pediu, se a ação é permitida.
async function permitido(
  supabase: Awaited<ReturnType<typeof carregarPerfil>>["supabase"],
  funcao: "pode_criar" | "pode_gerir" | "pode_mudar_turno",
  args: Record<string, unknown> = {},
) {
  const { data, error } = await supabase.rpc(funcao, args);
  return !error && data === true;
}

async function auditar(autor: string, acao: string, alvo: string | null, detalhes: object) {
  await criarClienteAdmin().from("auditoria").insert({
    autor_id: autor,
    acao,
    alvo_id: alvo,
    detalhes,
  });
}

// Carrega a conta-alvo com a sessão de quem pediu: se as regras do banco
// não deixam ver, também não deixam mexer.
async function carregarAlvo(
  supabase: Awaited<ReturnType<typeof carregarPerfil>>["supabase"],
  id: string,
) {
  const { data } = await supabase
    .from("perfis")
    .select("id, login, nome, papel, turno, ativo")
    .eq("id", id)
    .maybeSingle<{ id: string; login: string; nome: string; papel: Papel; turno: Turno | null; ativo: boolean }>();
  return data;
}

export async function criarConta(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase, perfil } = await carregarPerfil();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return SEM_CHAVE;
  const nome = String(dados.get("nome") ?? "").trim().toUpperCase();
  const login = String(dados.get("login") ?? "").trim().toLowerCase();
  const papel = lerPapel(dados.get("papel"));
  const turno = lerTurno(dados.get("turno"));

  if (nome.length < 1 || nome.length > 80) return { erro: "Informe o nome (até 80 caracteres)." };
  if (!FORMATO_LOGIN.test(login)) {
    return { erro: "Login inválido: 3 a 30 caracteres, só letras minúsculas, números, ponto, hífen ou sublinhado." };
  }
  if (!papel) return { erro: "Escolha o papel." };
  if (precisaTurno(papel) && !turno) return { erro: "Operador e supervisor de turno precisam de um turno." };

  if (!(await permitido(supabase, "pode_criar", { p_papel: papel, p_turno: turno }))) return SEM_PERMISSAO;

  const admin = criarClienteAdmin();
  const { data: existente } = await admin.from("perfis").select("id").eq("login", login).maybeSingle();
  if (existente) return { erro: `O login "${login}" já existe.` };

  const senha = gerarSenhaProvisoria();
  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email: emailInterno(login),
    password: senha,
    email_confirm: true,
  });
  if (erroAuth || !criado.user) {
    return erroAuth?.message.toLowerCase().includes("already")
      ? { erro: `O login "${login}" já existe.` }
      : FALHA;
  }

  const { error: erroPerfil } = await admin.from("perfis").insert({
    id: criado.user.id,
    login,
    nome,
    papel,
    turno,
    trocar_senha: true,
  });
  if (erroPerfil) {
    // Desfaz a conta de login para não sobrar usuário sem perfil.
    await admin.auth.admin.deleteUser(criado.user.id);
    return FALHA;
  }

  await auditar(perfil.id, "criar_conta", criado.user.id, { login, nome, papel, turno });
  revalidatePath("/equipe");
  return { ok: `Conta de ${nome} criada.`, login, senha };
}

export async function gerarNovaSenha(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase, perfil } = await carregarPerfil();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return SEM_CHAVE;
  const id = String(dados.get("id") ?? "");
  const alvo = await carregarAlvo(supabase, id);
  if (!alvo || !(await permitido(supabase, "pode_gerir", { alvo: id }))) return SEM_PERMISSAO;

  const admin = criarClienteAdmin();
  const senha = gerarSenhaProvisoria();
  const { error } = await admin.auth.admin.updateUserById(id, { password: senha });
  if (error) return FALHA;
  await admin.from("perfis").update({ trocar_senha: true }).eq("id", id);

  await auditar(perfil.id, "gerar_senha", id, { login: alvo.login });
  revalidatePath("/equipe");
  return { ok: `Nova senha provisória de ${alvo.nome}.`, login: alvo.login, senha };
}

export async function alterarAtivo(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase, perfil } = await carregarPerfil();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return SEM_CHAVE;
  const id = String(dados.get("id") ?? "");
  const ativo = String(dados.get("ativo")) === "true";
  const alvo = await carregarAlvo(supabase, id);
  if (!alvo || !(await permitido(supabase, "pode_gerir", { alvo: id }))) return SEM_PERMISSAO;

  const admin = criarClienteAdmin();
  const { error } = await admin.from("perfis").update({ ativo }).eq("id", id);
  if (error) return FALHA;
  // Bloqueia (ou libera) o login também, para derrubar sessões abertas.
  await admin.auth.admin.updateUserById(id, { ban_duration: ativo ? "none" : "876000h" });

  await auditar(perfil.id, ativo ? "reativar_conta" : "desativar_conta", id, { login: alvo.login });
  revalidatePath("/equipe");
  return { ok: ativo ? `${alvo.nome} reativado.` : `${alvo.nome} desativado.` };
}

export async function alterarTurno(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase, perfil } = await carregarPerfil();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return SEM_CHAVE;
  const id = String(dados.get("id") ?? "");
  const turno = lerTurno(dados.get("turno"));
  const alvo = await carregarAlvo(supabase, id);
  if (!alvo) return SEM_PERMISSAO;
  if (precisaTurno(alvo.papel) && !turno) return { erro: "Esse papel precisa de um turno." };
  if (
    !(await permitido(supabase, "pode_mudar_turno")) ||
    !(await permitido(supabase, "pode_gerir", { alvo: id })) ||
    !(await permitido(supabase, "pode_criar", { p_papel: alvo.papel, p_turno: turno }))
  ) {
    return SEM_PERMISSAO;
  }

  const { error } = await criarClienteAdmin().from("perfis").update({ turno }).eq("id", id);
  if (error) return FALHA;
  await auditar(perfil.id, "mudar_turno", id, { login: alvo.login, de: alvo.turno, para: turno });
  revalidatePath("/equipe");
  return { ok: `Turno de ${alvo.nome} alterado.` };
}

export async function alterarPapel(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const { supabase, perfil } = await carregarPerfil();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return SEM_CHAVE;
  const id = String(dados.get("id") ?? "");
  const papel = lerPapel(dados.get("papel"));
  const alvo = await carregarAlvo(supabase, id);
  if (!alvo || !papel) return SEM_PERMISSAO;
  if (precisaTurno(papel) && !alvo.turno) return { erro: "Defina um turno antes de dar esse papel." };
  if (
    !(await permitido(supabase, "pode_gerir", { alvo: id })) ||
    !(await permitido(supabase, "pode_criar", { p_papel: papel, p_turno: alvo.turno }))
  ) {
    return SEM_PERMISSAO;
  }

  const { error } = await criarClienteAdmin().from("perfis").update({ papel }).eq("id", id);
  if (error) return FALHA;
  await auditar(perfil.id, "mudar_papel", id, { login: alvo.login, de: alvo.papel, para: papel });
  revalidatePath("/equipe");
  return { ok: `Papel de ${alvo.nome} alterado.` };
}
