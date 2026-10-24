import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarContagens, type Filtro } from "@/lib/consultas";
import { hojeCuiaba, TURNOS, type Turno } from "@/lib/tempo";

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

// Exporta contagens diárias em CSV.
//   sem parâmetros  -> o histórico de quem está logado
//   u=<id>          -> uma pessoa       t=<turno> -> um turno
//   escopo=tudo     -> tudo que a pessoa pode ver (comparação de turnos)
//   de / ate        -> recorte de datas
// O banco aplica as regras de acesso: pedir o que não pode ver devolve vazio.
// Separador ";" e BOM para o Excel em português abrir certo.
export async function GET(request: NextRequest) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Sem sessão", { status: 401 });

  const sp = request.nextUrl.searchParams;
  const de = sp.get("de") ?? undefined;
  const ate = sp.get("ate") ?? undefined;
  const u = sp.get("u") ?? undefined;
  const t = sp.get("t") ?? undefined;
  if ((de && !DATA.test(de)) || (ate && !DATA.test(ate)) || (u && !UUID.test(u)) || (t && !(TURNOS as string[]).includes(t))) {
    return new NextResponse("Parâmetros inválidos", { status: 400 });
  }

  const filtro: Filtro = { de, ate };
  let escopo = "meu";
  if (u) { filtro.usuarioId = u; escopo = "pessoa"; }
  else if (t) { filtro.turno = t as Turno; escopo = `turno_${t}`; }
  else if (sp.get("escopo") !== "tudo") filtro.usuarioId = user.id;
  else escopo = "todos_os_turnos";

  const [{ data: perfis }, { linhas, erro }] = await Promise.all([
    supabase.from("perfis").select("id, login"),
    buscarContagens(supabase, filtro),
  ]);
  if (erro) return new NextResponse("Erro ao gerar o arquivo", { status: 500 });

  const logins = new Map((perfis ?? []).map((p) => [p.id as string, p.login as string]));
  const cabecalho = "dia;login;turno_da_checagem;total;origem";
  const corpo = linhas.map((l) =>
    [l.dia, logins.get(l.usuario_id ?? "") ?? "outro_turno", l.turno ?? "", l.total, l.origem].join(";"),
  );
  const csv = "﻿" + [cabecalho, ...corpo].join("\r\n") + "\r\n";

  const quem = escopo === "pessoa" ? logins.get(u!) ?? "pessoa" : escopo === "meu" ? logins.get(user.id) ?? "meu" : escopo;
  const periodo = de || ate ? `${de ?? "inicio"}_a_${ate ?? hojeCuiaba()}` : `ate_${hojeCuiaba()}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ciosp_${quem}_${periodo}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
