import type { ProgramSummary } from "../api";

interface Props {
  programs: ProgramSummary[];
  loading: boolean;
  onRefresh: () => void;
  onAdd: () => void;
}

export function ProgramsPanel({ programs, loading, onRefresh, onAdd }: Props) {
  return (
    <section className="rounded-xl bg-slate-900/60 p-6 shadow-soft backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Programs</h2>
          <p className="text-xs text-slate-500">Programs cloned or loaded into LiteSVM.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-cyan-400 hover:text-cyan-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Add program
          </button>
        </div>
      </header>
      <div className="mt-4 overflow-x-auto">
        {programs.length === 0 ? (
          <p className="text-sm text-slate-500">No programs registered yet.</p>
        ) : (
          <table className="w-full min-w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-2 pr-4">Program ID</th>
                <th className="pb-2 pr-4">Owner</th>
                <th className="pb-2 pr-4">Executable</th>
                <th className="pb-2 pr-4">Data (bytes)</th>
                <th className="pb-2">Lamports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {programs.map((program) => (
                <tr key={program.programId} className="hover:bg-slate-900/80">
                  <td className="py-2 pr-4 font-mono text-xs text-cyan-200">
                    {program.programId}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-slate-400">
                    {program.owner}
                  </td>
                  <td className="py-2 pr-4 text-xs">{program.executable ? "Yes" : "No"}</td>
                  <td className="py-2 pr-4 text-xs">{program.dataLen.toLocaleString()}</td>
                  <td className="py-2 text-xs">{BigInt(program.lamports).toString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
