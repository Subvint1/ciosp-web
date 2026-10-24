import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarContagens } from "@/lib/consultas";
import { hojeCuiaba } from "@/lib/tempo";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

// Exporta o histórico de quem está logado (tudo, ou de "de" até "ate").
// Separador ";" e BOM para o Excel em português abrir certo.
export async function GET(request: NextRequest) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Sem sessão", { status: 401 });

  const de = request.nextUrl.searchParams.get("de") ?? undefined;
  const ate = request.nextUrl.searchParams.get("ate") ?? undefined;
  if ((de && !DATA.test(de)) || (ate && !DATA.test(ate))) {
    return new NextResponse("Período inválido", { status: 400 });
  }

  const [{ data: perfil }, { linhas, erro }] = await Promise.all([
    supabase.from("perfis").select("login, turno").eq("id", user.id).maybeSingle(),
    buscarContagens(supabase, user.id, de, ate),
  ]);
  if (erro) return new NextResponse("Erro ao gerar o arquivo", { status: 500 });

  const cabecalho = "dia;turno_da_checagem;total;origem;no_turno_do_perfil";
  const corpo = linhas.map((l) => {
    const noPerfil = l.origem === "importado" || !perfil?.turno || l.turno === perfil.turno;
    return [l.dia, l.turno ?? "", l.total, l.origem, noPerfil ? "sim" : "nao"].join(";");
  });
  const csv = "﻿" + [cabecalho, ...corpo].join("\r\n") + "\r\n";
  const periodo = de || ate ? `${de ?? "inicio"}_a_${ate ?? hojeCuiaba()}` : `ate_${hojeCuiaba()}`;
  const nome = `ciosp_${perfil?.login ?? "historico"}_${periodo}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
