import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Roda antes de cada página: renova a sessão e manda quem não está logado
// para /login. É só conveniência de navegação: quem protege os dados é o banco.
export async function middleware(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(lista) {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rotaLogin = request.nextUrl.pathname.startsWith("/login");
  const rotaSair = request.nextUrl.pathname.startsWith("/sair");
  if (rotaSair) return resposta;
  if (!user && !rotaLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && rotaLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    return NextResponse.redirect(url);
  }
  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
