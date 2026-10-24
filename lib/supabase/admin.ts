import { createClient } from "@supabase/supabase-js";

// Cliente com a chave service_role: ignora as regras de acesso do banco.
// Só pode ser importado em código de servidor ("use server") e só é usado
// DEPOIS que o banco confirmou, com a sessão de quem pediu, que a ação é permitida.
// A chave fica só nas variáveis de ambiente do servidor (sem NEXT_PUBLIC_).
export function criarClienteAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
