import { randomInt } from "node:crypto";

// Senha provisória legível: sem letras e números que se confundem (0/O, 1/l/I).
const LETRAS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function gerarSenhaProvisoria(tamanho = 10): string {
  let s = "";
  for (let i = 0; i < tamanho; i++) s += LETRAS[randomInt(LETRAS.length)];
  return s;
}
