"use client";

import { useRef } from "react";
import { NOME_PRESET, type Filtros, type Preset } from "@/lib/relatorio";
import { NOME_TURNO, TURNOS } from "@/lib/tempo";

type Pessoa = { id: string; nome: string; turno: string | null };

// Barra de filtros: cada mudança já aplica (como no Data Studio).
// Sem JavaScript, o botão APLICAR faz o mesmo.
export default function FiltrosRelatorio({
  f,
  pessoas,
  turnoFixo,
}: {
  f: Filtros;
  pessoas: Pessoa[];
  turnoFixo: string | null; // supervisor de turno: só o próprio turno
}) {
  const form = useRef<HTMLFormElement>(null);
  const aplicar = () => form.current?.requestSubmit();

  function mudouPreset(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value !== "personalizado") {
      const de = form.current?.elements.namedItem("de") as HTMLInputElement | null;
      const ate = form.current?.elements.namedItem("ate") as HTMLInputElement | null;
      if (de) de.value = "";
      if (ate) ate.value = "";
    }
    aplicar();
  }

  function mudouData() {
    const sel = form.current?.elements.namedItem("periodo") as HTMLSelectElement | null;
    if (sel) sel.value = "personalizado";
    const de = (form.current?.elements.namedItem("de") as HTMLInputElement | null)?.value;
    const ate = (form.current?.elements.namedItem("ate") as HTMLInputElement | null)?.value;
    if (de && ate) aplicar();
  }

  const nomesEscolhidos = pessoas.filter((p) => f.pessoas.includes(p.id)).map((p) => p.nome);

  return (
    <form ref={form} method="get" action="/relatorio" className="rel-filtros">
      <input type="hidden" name="ordem" value={f.ordem} />

      <div className="rel-controle rel-periodo">
        <span>Período</span>
        <div className="rel-linha">
          <select name="periodo" defaultValue={f.preset} onChange={mudouPreset} aria-label="Período">
            {(Object.keys(NOME_PRESET) as Preset[]).map((p) => (
              <option key={p} value={p}>{NOME_PRESET[p]}</option>
            ))}
          </select>
          <input type="date" name="de" defaultValue={f.de} onChange={mudouData} aria-label="De" />
          <input type="date" name="ate" defaultValue={f.ate} onChange={mudouData} aria-label="Até" />
        </div>
      </div>

      <label className="rel-controle">
        <span>Turno do perfil</span>
        {turnoFixo ? (
          <select disabled value={turnoFixo} aria-label="Turno do perfil">
            <option value={turnoFixo}>{NOME_TURNO[turnoFixo as keyof typeof NOME_TURNO]}</option>
          </select>
        ) : (
          <select name="tperfil" defaultValue={f.turnoPerfil} onChange={aplicar}>
            <option value="todos">Todos</option>
            {TURNOS.map((t) => <option key={t} value={t}>{NOME_TURNO[t]}</option>)}
          </select>
        )}
      </label>

      <label className="rel-controle">
        <span>Turno da checagem</span>
        <select name="tcheck" defaultValue={f.turnoChecagem} onChange={aplicar}>
          <option value="todos">Todos</option>
          {TURNOS.map((t) => <option key={t} value={t}>{NOME_TURNO[t]}</option>)}
        </select>
      </label>

      <div className="rel-controle">
        <span>Pessoas</span>
        <details className="rel-multi">
          <summary>
            {nomesEscolhidos.length === 0
              ? "Todas"
              : nomesEscolhidos.length <= 2
                ? nomesEscolhidos.join(", ")
                : `${nomesEscolhidos.length} selecionadas`}
          </summary>
          <div className="rel-multi-lista">
            {pessoas.map((p) => (
              <label key={p.id}>
                <input type="checkbox" name="pessoa" value={p.id} defaultChecked={f.pessoas.includes(p.id)} />
                {p.nome}
                {p.turno && <small> · {NOME_TURNO[p.turno as keyof typeof NOME_TURNO]}</small>}
              </label>
            ))}
            <button type="submit" className="rel-botao-mini">APLICAR</button>
          </div>
        </details>
      </div>

      <label className="rel-controle">
        <span>Papel</span>
        <select name="papel" defaultValue={f.papel} onChange={aplicar}>
          <option value="todos">Todos</option>
          <option value="operador">Operadores</option>
          <option value="supervisao">Supervisão e admin</option>
        </select>
      </label>

      <label className="rel-controle">
        <span>Origem</span>
        <select name="origem" defaultValue={f.origem} onChange={aplicar}>
          <option value="todas">Todas</option>
          <option value="extensao">Extensão</option>
          <option value="importado">Planilha antiga</option>
        </select>
      </label>

      <label className="rel-controle">
        <span>Situação</span>
        <select name="situacao" defaultValue={f.situacao} onChange={aplicar}>
          <option value="todos">Todas as contas</option>
          <option value="ativos">Só ativas</option>
        </select>
      </label>

      <label className="rel-controle">
        <span>Agrupar por</span>
        <select name="agrupar" defaultValue={f.agrupar} onChange={aplicar}>
          <option value="dia">Dia</option>
          <option value="semana">Semana</option>
          <option value="mes">Mês</option>
        </select>
      </label>

      <label className="rel-controle rel-meta">
        <span>Meta do gráfico</span>
        <input
          type="number"
          name="meta"
          min={1}
          placeholder="automática"
          defaultValue={f.meta ?? ""}
          onBlur={aplicar}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aplicar(); } }}
        />
      </label>

      <noscript><button type="submit">APLICAR</button></noscript>
    </form>
  );
}
