import { NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeCuiaba } from "@/lib/tempo";

// Exporta o histórico completo de quem está logado.
// Separador ";" e BOM para o Excel em português abrir certo.
export async function GET() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Sem sessão", { status: 401 });

  const [{ data: perfil }, { data: linhas, error }] = await Promise.all([
    supabase.from("perfis").select("login, turno").eq("id", user.id).maybeSingle(),
    supabase
      .from("contagem_diaria")
      .select("dia, turno, total, origem")
      .eq("usuario_id", user.id)
      .order("dia", { ascending: true }),
  ]);
  if (error) return new NextResponse("Erro ao gerar o arquivo", { status: 500 });

  const cabecalho = "dia;turno_da_checagem;total;origem;no_turno_do_perfil";
  const corpo = (linhas ?? []).map((l) => {
    const noPerfil = l.origem === "importado" || !perfil?.turno || l.turno === perfil.turno;
    return [l.dia, l.turno ?? "", l.total, l.origem, noPerfil ? "sim" : "nao"].join(";");
  });
  const csv = "﻿" + [cabecalho, ...corpo].join("\r\n") + "\r\n";
  const nome = `ciosp_${perfil?.login ?? "historico"}_${hojeCuiaba()}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
