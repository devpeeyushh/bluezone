"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import facilityRecord from "../../../assets/broadcast/facility-record.jpg";

// 4×4 click-to-swap reconstruction of the final visual record. Any arrangement is reachable by
// swaps, so every shuffle is solvable; the shuffle is a single random cycle (Sattolo), so no
// fragment starts in its own slot and the opening arrangement can never be the solved one.
// order[slot] = fragment index; solved only when order[i] === i for every slot.

const GRID = 4;
const TILE_COUNT = GRID * GRID;

const shuffled = (): number[] => {
  const a = Array.from({ length: TILE_COUNT }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i); // j < i: Sattolo's algorithm
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const countCorrect = (order: number[]) => order.reduce((n, piece, slot) => n + (piece === slot ? 1 : 0), 0);

// Survives closing and reopening the console mid-reconstruction (memory only: a page reload starts
// a fresh shuffle; cleared once solved)
let savedOrder: number[] | null = null;

// Fits the 3:2 record inside the console without scrolling on short laptop screens, but never
// collapses on very short viewports (e.g. landscape phones): the console scrolls instead
const FRAME_WIDTH = "min(100%, max(18rem, calc((92vh - 335px) * 1.5)))";

export const TransmissionPuzzle: React.FC<{ onSolved: () => void }> = ({ onSolved }) => {
  const [order, setOrder] = useState<number[]>(() => (savedOrder ??= shuffled()));
  const [selected, setSelected] = useState<number | null>(null);
  const correct = useMemo(() => countCorrect(order), [order]);
  const solvedRef = useRef(false);

  useEffect(() => {
    savedOrder = order;
    if (correct === TILE_COUNT && !solvedRef.current) {
      solvedRef.current = true;
      savedOrder = null;
      onSolved();
    }
  }, [order, correct, onSolved]);

  const pick = useCallback(
    (slot: number) => {
      if (solvedRef.current) return;
      if (selected === null) {
        setSelected(slot);
        return;
      }
      if (selected !== slot) {
        setOrder((prev) => {
          const next = prev.slice();
          [next[selected], next[slot]] = [next[slot], next[selected]];
          return next;
        });
      }
      setSelected(null);
    },
    [selected]
  );

  const reset = () => {
    setSelected(null);
    setOrder(shuffled());
  };

  const pct = Math.round((correct / TILE_COUNT) * 100);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] tracking-[0.3em] text-radio-textMuted">RECONSTRUCTION PROGRESS</div>
          <div className="text-sm font-bold tracking-[0.2em] text-cyan-300 tabular-nums" aria-live="polite">
            {correct} / {TILE_COUNT} CORRECT
          </div>
          <div className="mt-1 h-1 w-40 max-w-full rounded bg-black/70 border border-cyan-500/20 overflow-hidden" aria-hidden>
            <div className="h-full bg-cyan-400/80 transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-radio-border bg-black/50 hover:border-cyan-400/60 text-[10px] font-bold tracking-wider text-slate-300 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden />
          RESET PUZZLE
        </button>
      </div>

      <div className="mx-auto" style={{ width: FRAME_WIDTH }}>
        <div
          role="group"
          aria-label="Corrupted visual record, 16 fragments. Select two fragments to swap them."
          className="relative grid grid-cols-4 grid-rows-4 aspect-[3/2] w-full select-none overflow-hidden rounded border border-cyan-500/40 bg-black shadow-[0_0_24px_rgba(34,211,238,0.08)]"
          style={{ touchAction: "manipulation" }}
        >
          {order.map((piece, slot) => {
            const col = piece % GRID;
            const row = Math.floor(piece / GRID);
            const isSelected = selected === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => pick(slot)}
                aria-pressed={isSelected}
                aria-label={`Fragment slot ${slot + 1} of ${TILE_COUNT}${isSelected ? ", selected" : ""}`}
                data-slot={slot}
                className={`relative min-w-0 min-h-0 focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300 ${
                  isSelected ? "z-10" : ""
                }`}
                style={{
                  backgroundImage: `url(${facilityRecord.src})`,
                  backgroundSize: `${GRID * 100}% ${GRID * 100}%`,
                  backgroundPosition: `${(col * 100) / (GRID - 1)}% ${(row * 100) / (GRID - 1)}%`,
                }}
              >
                {/* Fragment boundary + selection state */}
                <span
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 ${
                    isSelected
                      ? "ring-2 ring-inset ring-amber-300 bg-amber-300/15"
                      : "ring-1 ring-inset ring-cyan-300/25 hover:bg-cyan-300/10"
                  }`}
                />
              </button>
            );
          })}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.18)_0px,rgba(0,0,0,0.18)_1px,transparent_1px,transparent_3px)]"
          />
        </div>
        <p className="mt-2 text-[10px] text-radio-textMuted tracking-wider">
          {selected === null ? "SELECT A FRAGMENT, THEN THE SLOT TO SWAP IT WITH." : "FRAGMENT SELECTED. SELECT ANOTHER TO SWAP, OR THE SAME ONE TO CANCEL."}
        </p>
      </div>
    </div>
  );
};
