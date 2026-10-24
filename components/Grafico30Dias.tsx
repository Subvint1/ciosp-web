import type { Dia } from "@/lib/painel";
import { formatarDia } from "@/lib/tempo";
import GraficoBarras from "@/components/GraficoBarras";

// Os últimos 30 dias do painel, com a linha da meta diária.
export default function Grafico30Dias({ dias, meta }: { dias: Dia[]; meta: number }) {
  return (
    <GraficoBarras
      barras={dias.map((d) => ({ chave: d.dia, rotulo: formatarDia(d.dia), meu: d.meu, outro: d.outro, total: d.total }))}
      meta={meta}
      descricao="Checagens por dia nos últimos 30 dias"
    />
  );
}
