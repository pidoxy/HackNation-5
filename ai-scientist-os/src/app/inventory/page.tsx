"use client";

import { useState } from "react";
import TopNav from "@/components/TopNav";
import SideNav from "@/components/SideNav";

const REAGENTS = [
  {
    name: "FITC-Dextran",
    cas: "60842-46-8",
    supplier: "Sigma-Aldrich",
    cat: "#F04-1G",
    stock: 850,
    unit: "mg",
    maxStock: 1000,
    location: "Cold Rm A · Shelf 2",
    status: "ok",
  },
  {
    name: "Claudin-1 Antibody",
    cas: "N/A",
    supplier: "Thermo Fisher",
    cat: "#51-9000",
    stock: 12,
    unit: "µL",
    maxStock: 500,
    location: "-80°C Freez · Box 4",
    status: "critical",
  },
  {
    name: "DAPI Stain",
    cas: "28718-90-3",
    supplier: "Abcam",
    cat: "#ab228549",
    stock: 3.5,
    unit: "mL",
    maxStock: 10,
    location: "4°C Fridge B",
    status: "low",
  },
];

const STATUS_DOT: Record<string, string> = {
  ok:       "bg-emerald-400",
  low:      "bg-amber-400",
  critical: "bg-red-400",
};

const STOCK_BAR: Record<string, string> = {
  ok:       "bg-emerald-400",
  low:      "bg-amber-400",
  critical: "bg-red-500",
};

const CRITICAL_ITEMS = [
  { name: "Claudin-1 Antibody", qty: "12 µL",  depletion: "2 days" },
  { name: "HEPES Buffer",        qty: "50 mL",  depletion: "Today"  },
];

export default function InventoryPage() {
  const [search, setSearch] = useState("");

  const filtered = REAGENTS.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cas.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto bg-[var(--content-bg)] p-5">
          <div className="flex gap-4 h-full">

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="mb-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)] mb-1">
                  Lab OS
                </p>
                <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)] mb-0.5">
                  Reagent Inventory
                </h1>
                <p className="text-[12px] text-[var(--text-tertiary)]">
                  Manage real-time stock levels and automated procurement.
                </p>
              </div>

              {/* Search + filter row */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2 flex-1 bg-[var(--surface-panel)] border border-[var(--border)] rounded px-3 py-2">
                  <span className="material-symbols-outlined text-[var(--text-muted)] text-[15px]">search</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search CAS, Name…"
                    className="flex-1 bg-transparent text-[12px] text-[var(--text-primary)] placeholder-[#464555] outline-none font-mono"
                  />
                </div>
                <button className="flex items-center gap-1.5 bg-[var(--surface-panel)] border border-[var(--border)] rounded px-3 py-2 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                  <span className="material-symbols-outlined text-[14px]">filter_list</span>
                  Filter
                </button>
              </div>

              {/* Table */}
              <div className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[2fr_1.5fr_2fr_1.5fr_auto] gap-4 px-5 py-3 border-b border-[var(--border)]">
                  {["COMPOUND / CAS", "SUPPLIER / CAT #", "STOCK LEVEL", "LOCATION", "ACTIONS"].map((h) => (
                    <span key={h} className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{h}</span>
                  ))}
                </div>

                {/* Table rows */}
                {filtered.map((r) => {
                  const pct = Math.round((r.stock / r.maxStock) * 100);
                  return (
                    <div
                      key={r.name}
                      className="grid grid-cols-[2fr_1.5fr_2fr_1.5fr_auto] gap-4 px-5 py-4 border-b border-[var(--border)] last:border-0 items-center"
                    >
                      {/* Compound */}
                      <div className="flex items-start gap-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${STATUS_DOT[r.status]}`} />
                        <div>
                          <div className="text-[13px] font-medium text-[var(--text-primary)]">{r.name}</div>
                          <div className="font-mono text-[10px] text-[var(--text-muted)]">CAS: {r.cas}</div>
                        </div>
                      </div>

                      {/* Supplier */}
                      <div>
                        <div className="text-[12px] text-[var(--text-secondary)]">{r.supplier}</div>
                        <div className="font-mono text-[10px] text-[var(--accent-strong)]">{r.cat}</div>
                      </div>

                      {/* Stock level */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1 bg-[var(--surface-subtle)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${STOCK_BAR[r.status]}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`font-mono text-[11px] shrink-0 ${r.status === "critical" ? "text-red-400" : r.status === "low" ? "text-amber-400" : "text-[var(--text-tertiary)]"}`}>
                          {r.stock} {r.unit}
                        </span>
                      </div>

                      {/* Location */}
                      <div className="text-[11px] text-[var(--text-tertiary)]">{r.location}</div>

                      {/* Actions */}
                      <div>
                        {r.status === "critical" ? (
                          <button className="font-mono text-[10px] uppercase tracking-widest bg-[var(--accent-strong)] hover:bg-[var(--accent-hover)] text-white px-2.5 py-1 rounded transition-colors">
                            Order
                          </button>
                        ) : (
                          <span className="text-[var(--text-faint)] text-[11px]">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    Showing 1–{filtered.length} of 1,248 records
                  </span>
                  <div className="flex gap-1">
                    <button className="w-6 h-6 flex items-center justify-center border border-[var(--border)] rounded text-[var(--text-muted)] hover:text-[var(--text-tertiary)] hover:border-[var(--border-subtle)] transition-colors">
                      <span className="material-symbols-outlined text-[13px]">chevron_left</span>
                    </button>
                    <button className="w-6 h-6 flex items-center justify-center border border-[var(--border)] rounded text-[var(--text-muted)] hover:text-[var(--text-tertiary)] hover:border-[var(--border-subtle)] transition-colors">
                      <span className="material-symbols-outlined text-[13px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="w-52 shrink-0 flex flex-col gap-3">

              {/* Critical Low */}
              <div className="bg-[var(--surface-panel)] border border-red-500/30 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-red-500/10 border-b border-red-500/20">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-red-400 text-[13px]">warning</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-red-400">Critical Low</span>
                  </div>
                  <span className="font-mono text-[10px] bg-red-500/20 border border-red-500/30 text-red-400 px-1.5 py-0.5 rounded">
                    {CRITICAL_ITEMS.length} Items
                  </span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {CRITICAL_ITEMS.map((item) => (
                    <div key={item.name} className="p-3">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[12px] font-medium text-[var(--text-primary)]">{item.name}</span>
                        <span className="font-mono text-[10px] text-red-400">{item.qty}</span>
                      </div>
                      <p className="font-mono text-[9px] text-[var(--text-muted)] mb-2">
                        Est. depletion: {item.depletion}
                      </p>
                      <button className="w-full flex items-center justify-center gap-1 border border-[var(--surface-elevated)] rounded text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] py-1.5 transition-colors">
                        <span className="material-symbols-outlined text-[12px]">shopping_cart</span>
                        Draft Order
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Procurement */}
              <div className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[var(--border)]">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                    Active Procurement
                  </span>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded bg-[var(--surface-elevated)] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[var(--accent-strong)] text-[14px]">local_shipping</span>
                    </div>
                    <div>
                      <div className="font-mono text-[11px] font-semibold text-[var(--accent-text)]">PO-2023-884</div>
                      <div className="font-mono text-[9px] text-[var(--text-muted)]">Fisher Scientific</div>
                      <div className="font-mono text-[9px] text-emerald-400">Arriving Tomorrow</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
