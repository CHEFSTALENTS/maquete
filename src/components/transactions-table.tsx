"use client";

import { useMemo, useState } from "react";
import { Shell } from "@/components/ui/card-shell";
import { formatDateTime, formatMoney } from "@/lib/utils";
import type { Transaction } from "@/lib/mock-data";

export function TransactionsTable({
  rows,
  currency = "USD",
  emptyText = "No transactions.",
  onStatusClick,
}: {
  rows: Transaction[];
  currency?: string;
  emptyText?: string;
  onStatusClick?: (row: Transaction) => void;
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

  return (
    <div className="w-full">
      {/* controls row */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Filter statuses..."
          className="h-10 w-full max-w-[520px] rounded-lg bg-white/5 border border-white/10 px-3 text-sm outline-none placeholder:text-white/40 focus:border-white/20"
        />

        <button className="h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-sm flex items-center gap-2 hover:bg-white/10 transition">
          Columns <span className="opacity-70">⌄</span>
        </button>
      </div>

      <Shell className="overflow-hidden bg-white/0 border border-white/10">
        <div className="w-full overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/0">
              <tr className="text-white/70">
                <th className="text-left font-medium px-4 py-3 border-b border-white/10 w-[90px]">
                  Type
                </th>
                <th className="text-left font-medium px-4 py-3 border-b border-white/10 w-[120px]">
                  Status
                </th>
                <th className="text-left font-medium px-4 py-3 border-b border-white/10">
                  Description <span className="opacity-60">⌄</span>
                </th>
                <th className="text-right font-medium px-4 py-3 border-b border-white/10 w-[140px]">
                  Amount
                </th>
                <th className="text-right font-medium px-4 py-3 border-b border-white/10 w-[170px]">
                  Date <span className="opacity-60">⌄</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-white/55">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                paged.map((r) => {
                  const isClickable = r.status === "Failed" && typeof onStatusClick === "function";
                  return (
                    <tr key={r.id} className="border-b border-white/5 last:border-b-0">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs">
                          {r.type}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {isClickable ? (
                          <button
                            type="button"
                            onClick={() => onStatusClick(r)}
                            className="text-rose-200/90 underline underline-offset-2 hover:opacity-100 opacity-90 transition"
                            title="Voir le détail"
                          >
                            {r.status}
                          </button>
                        ) : (
                          <span className={r.status === "Failed" ? "text-rose-200/90" : "text-white/75"}>
                            {r.status}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-white/85">{r.description}</td>
                      <td className="px-4 py-3 text-right text-white/85">
                        {formatMoney(r.amount, currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-white/70">
                        {formatDateTime(r.date)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-white/10 text-sm text-white/70">
          <span className="mr-auto opacity-70">
            Page {safePage} of {pages}
          </span>

          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-40"
            disabled={safePage <= 1}
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-40"
            disabled={safePage >= pages}
          >
            Next
          </button>
        </div>
      </Shell>
    </div>
  );
}
