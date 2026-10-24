import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

// Encerra a sessão e volta para o login (com o motivo, se houver).
export async function GET(request: NextRequest) {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  const url = request.nextUrl.clone();
  const motivo = url.searchParams.get("motivo");
  url.pathname = "/login";
  url.search = motivo ? `?erro=${encodeURIComponent(motivo)}` : "";
  return NextResponse.redirect(url);
}
