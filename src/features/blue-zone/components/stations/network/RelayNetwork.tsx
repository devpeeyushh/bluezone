"use client";

import React from "react";
import { Send, Radio } from "lucide-react";
import { RELAY_LINKS, RELAY_NODES, RelayNode, RelayNodeStatus } from "../../../data/ctf/networkMap";

// CTF 02 relay schematic + node inspector. The map is an SVG backdrop (river, rail bridge, mesh
// links) with real <button> nodes laid over it, so every node is keyboard reachable.

const STATUS_STYLE: Record<RelayNodeStatus, { dot: string; text: string; ring: string }> = {
  OFFLINE: { dot: "bg-red-500/70", text: "text-red-300", ring: "border-red-500/40" },
  DEGRADED: { dot: "bg-amber-400", text: "text-amber-300", ring: "border-amber-400/50" },
  INTERMITTENT: { dot: "bg-cyan-300 motion-safe:animate-pulse", text: "text-cyan-300", ring: "border-cyan-400/60" },
};

const byId = new Map(RELAY_NODES.map((n) => [n.id, n]));

export const RelayMap: React.FC<{ selectedId: string | null; onSelect: (id: string) => void }> = ({
  selectedId,
  onSelect,
}) => (
  <div className="relative w-full aspect-[5/4] rounded border border-radio-border bg-[radial-gradient(ellipse_at_50%_40%,#0b1f38_0%,#040a16_75%)] overflow-hidden">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
      {/* grid */}
      <defs>
        <pattern id="relay-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0 L0 0 0 10" fill="none" stroke="#12304f" strokeWidth="0.2" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#relay-grid)" />
      {/* river */}
      <path d="M52 0 C46 20 58 32 50 48 C43 62 56 76 50 100" fill="none" stroke="#0e3a5c" strokeWidth="5" strokeLinecap="round" />
      <path d="M52 0 C46 20 58 32 50 48 C43 62 56 76 50 100" fill="none" stroke="#1b5d8c" strokeWidth="0.5" strokeOpacity="0.7" />
      {/* rail bridge */}
      <path d="M18 40 L72 36" stroke="#3a4a66" strokeWidth="0.9" strokeDasharray="1.2 0.8" />
      {/* mesh links */}
      {RELAY_LINKS.map(({ a, b, broken }) => {
        const na = byId.get(a)!;
        const nb = byId.get(b)!;
        return (
          <line
            key={`${a}-${b}`}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            stroke={broken ? "#5a2630" : "#1f7aa8"}
            strokeWidth={broken ? 0.4 : 0.6}
            strokeDasharray={broken ? "1.5 1.5" : undefined}
          />
        );
      })}
    </svg>
    {/* Bank labels */}
    <span className="absolute left-2 bottom-2 text-[9px] tracking-[0.3em] text-slate-500">WEST BANK</span>
    <span className="absolute right-2 bottom-2 text-[9px] tracking-[0.3em] text-slate-500">EAST BANK</span>
    <span className="absolute left-[16%] top-[42%] text-[8px] tracking-[0.2em] text-slate-500">RAIL BRIDGE</span>

    {RELAY_NODES.map((node) => {
      const style = STATUS_STYLE[node.status];
      const selected = node.id === selectedId;
      return (
        <button
          key={node.id}
          type="button"
          onClick={() => onSelect(node.id)}
          aria-pressed={selected}
          aria-label={`${node.id}, ${node.status.toLowerCase()}`}
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-1.5 py-1 rounded border bg-black/70 text-[9px] sm:text-[10px] font-bold tracking-wider transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan ${
            selected ? "border-radio-cyan text-radio-textBright bg-cyan-950/80" : `${style.ring} text-slate-300 hover:text-white`
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${style.dot}`} aria-hidden />
          {node.id}
        </button>
      );
    })}
  </div>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <>
    <dt className="text-radio-textMuted">{label}</dt>
    <dd className="text-slate-200 break-words">{children}</dd>
  </>
);

export const NodeInspector: React.FC<{ node: RelayNode | null; onSendToWorkbench: (payload: string) => void }> = ({
  node,
  onSendToWorkbench,
}) => {
  if (!node) {
    return (
      <div className="h-full min-h-[10rem] flex flex-col items-center justify-center text-center gap-2 text-slate-400 text-xs p-4 rounded border border-dashed border-radio-border">
        <Radio className="w-6 h-6 text-radio-textMuted" />
        Select a relay node on the map to inspect its last buffered traffic.
      </div>
    );
  }
  const style = STATUS_STYLE[node.status];
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] tracking-[0.25em] text-radio-textMuted">NODE INSPECTOR</div>
        <div className="text-xl font-bold text-radio-cyan">{node.id}</div>
      </div>
      <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1 text-[11px]">
        <Row label="REGISTRY">{node.registry}</Row>
        <Row label="ALIAS">{node.alias}</Row>
        <Row label="LOCATION">{node.location}</Row>
        <Row label="STATUS">
          <span className={`font-bold ${style.text}`}>{node.status}</span>
        </Row>
        <Row label="LAST HEARTBEAT">{node.lastHeartbeat}</Row>
      </dl>

      {node.packet ? (
        <div className="rounded border border-radio-border bg-black/50 p-3 space-y-2">
          <div className="text-[10px] tracking-[0.25em] text-amber-300 font-bold">BUFFERED PACKET</div>
          <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1 text-[11px]">
            <Row label="FRAME">{node.packet.frame}</Row>
            <Row label="CIPHER">{node.packet.cipher}</Row>
            <Row label="KEY MATERIAL">{node.packet.key}</Row>
          </dl>
          <code className="block max-h-36 overflow-y-auto p-2.5 rounded bg-black/70 border border-radio-border text-[11px] leading-relaxed text-cyan-200/90 break-all select-text">
            {node.packet.payload}
          </code>
          <button
            type="button"
            onClick={() => onSendToWorkbench(node.packet!.payload)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-radio-cyan/60 bg-cyan-950/40 hover:bg-cyan-900/50 text-[10px] font-bold tracking-wider text-radio-textBright focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan"
          >
            <Send className="w-3 h-3" />
            SEND PACKET TO WORKBENCH
          </button>
        </div>
      ) : (
        <div className="rounded border border-radio-border bg-black/40 p-3 text-[11px] text-slate-400">
          {node.note ?? "No buffered traffic."}
        </div>
      )}
    </div>
  );
};
