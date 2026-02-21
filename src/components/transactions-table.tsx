"use client";

import { useMemo, useState } from "react";
import { formatDateTime, formatMoney } from "@/lib/utils";
import type { Transaction } from "@/lib/mock-data";

export function TransactionsTable({
  rows,
  currency = "USD",
  emptyText = "No transactions.",
}: {
  rows: Transaction[];
  currency?: string;
  emptyText?: string;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      return (
        r.description.toLowerCase().includes(s) ||
        r.status.toLowerCase().includes(s) ||
        r.type.toLowerCase().includes(s)
      );
    });
  }, [q, rows]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Optionnel: connecte le filtre du dessus
  // (si tu veux, je te branche le champ "Filter statuses..." à ce setQ)
  // pour l’instant, on garde un fallback invisible:
  // setQ est dispo si tu veux l’utiliser plus tard.

  return (
    <div>
      <div className="w-full overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-white/70">
            <tr className="border-b border-white/10">
              <th className="text-left font-medium px-3 py-3">Type</th>
              <th className="text-left font-medium px-3 py-3">Status</th>
              <th className="text-left font-medium px-3 py-3">
                Description <span className="opacity-60">↕</span>
              </th>
              <th className="text-right font-medium px-3 py-3">Amount</th>
              <th className="text-right font-medium px-3 py-3">
                Date <span className="opacity-60">↕</span>
              </th>
            </tr>
          </thead>

          <tbody className="text-white/85">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-white/55">
                  {emptyText}
                </td>
              </tr>
            ) : (
              paged.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-b-0">
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs">
                      {r.type}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs">
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">{r.description}</td>
                  <td className="px-3 py-3 text-right">{formatMoney(r.amount, currency)}</td>
                  <td className="px-3 py-3 text-right">{formatDateTime(r.date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* footer pagination like SolCard */}
      <div className="flex items-center justify-end gap-3 mt-3 text-sm text-white/70">
        <div>Page {safePage} of {pages}</div>
        <button
          className="px-3 py-1 rounded-md border border-white/15 hover:bg-white/5 transition disabled:opacity-40"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={safePage <= 1}
        >
          Previous
        </button>
        <button
          className="px-3 py-1 rounded-md border border-white/15 hover:bg-white/5 transition disabled:opacity-40"
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          disabled={safePage >= pages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
