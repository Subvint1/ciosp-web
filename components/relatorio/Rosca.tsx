import { NOME_TURNO, TURNOS, type Turno } from "@/lib/tempo";

const pct = (v: number, t: number) => (!t || !v ? "0%" : v / t < 0.01 ? "<1%" : `${Math.round((v / t) * 100)}%`);

const COR_TURNO: Record<Turno, string> = {
  madrugada: "#5B6BD5",
  manha: "#F9AB00",
  tarde: "#1E9E6A",
  noite: "#E0525B",
};

// Rosca da distribuição por turno da checagem, com a legenda ao lado.
export default function Rosca({ valores }: { valores: Record<Turno, number> }) {
  const total = TURNOS.reduce((s, t) => s + valores[t], 0);
  const R = 70, r = 42, cx = 90, cy = 90;
  let angulo = -Math.PI / 2;
  const fatias = TURNOS.filter((t) => valores[t] > 0).map((t) => {
    const parte = valores[t] / total;
    const a0 = angulo, a1 = angulo + parte * Math.PI * 2;
    angulo = a1;
    const grande = a1 - a0 > Math.PI ? 1 : 0;
    const p = (raio: number, a: number) => `${cx + raio * Math.cos(a)} ${cy + raio * Math.sin(a)}`;
    const d = parte >= 0.9999
      ? `M ${cx} ${cy - R} A ${R} ${R} 0 1 1 ${cx - 0.01} ${cy - R} L ${cx - 0.01} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z`
      : `M ${p(R, a0)} A ${R} ${R} 0 ${grande} 1 ${p(R, a1)} L ${p(r, a1)} A ${r} ${r} 0 ${grande} 0 ${p(r, a0)} Z`;
    return { t, d, parte };
  });

  return (
    <div className="rel-rosca">
      <svg viewBox="0 0 180 180" width={180} height={180} role="img" aria-label="Checagens por turno da checagem">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={(R + r) / 2} fill="none" stroke="#e0e0e0" strokeWidth={R - r} />
        ) : (
          fatias.map((f) => (
            <path key={f.t} d={f.d} fill={COR_TURNO[f.t]} stroke="#fff" strokeWidth={1.5}>
              <title>{`${NOME_TURNO[f.t]}: ${valores[f.t].toLocaleString("pt-BR")} (${Math.round(f.parte * 100)}%)`}</title>
            </path>
          ))
        )}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={20} fontWeight={700} fill="#111">{total.toLocaleString("pt-BR")}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize={11} fill="#666">checagens</text>
      </svg>
      <ul>
        {TURNOS.map((t) => (
          <li key={t}>
            <i style={{ background: COR_TURNO[t] }} />
            <span>{NOME_TURNO[t]}</span>
            <strong>{valores[t].toLocaleString("pt-BR")}</strong>
            <em>{pct(valores[t], total)}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}
