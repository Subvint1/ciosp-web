import { createBrowserClient } from "@supabase/ssr";

// Cliente usado nos componentes que rodam no navegador (login, troca de senha).
export function criarClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
