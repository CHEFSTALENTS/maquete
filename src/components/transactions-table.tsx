"use client";

import { useMemo, useState } from "react";
import { Shell } from "@/components/ui/card-shell";
import { formatDateTime, formatMoney } from "@/lib/utils";
import type { Transaction } from "@/lib/mock-data";

export function TransactionsTable({
  rows,
  currency = "USD",
  emptyText = "No transactions.", // ✅ nouveau
}: {
  rows: Transaction[];
  currency?: string;
  emptyText?: string; // ✅ nouveau
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
    <div className="mt-4">
      <Shell className="overflow-hidden">
        <div className="w-full overflow-auto">
          <table className="w-full text-sm">
            <tbody>
              {paged.length === 0 ? ( // ✅ nouveau
                <tr>
                  <td colSpan={3} className="py-10 text-center text-white/60">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id}>
                    <td>{r.description}</td>
                    <td>{formatMoney(r.amount, currency)}</td>
                    <td>{formatDateTime(r.date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Shell>
    </div>
  );
}
