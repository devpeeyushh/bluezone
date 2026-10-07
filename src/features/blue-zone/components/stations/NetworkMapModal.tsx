"use client";

import React, { useState } from "react";
import { Share2, X, Lock, CheckCircle2, ArrowRight, HelpCircle } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { CHALLENGES, CTF_01, CTF_02 } from "../../data/ctf/registry";
import { RELAY_NODES } from "../../data/ctf/networkMap";
import { sound } from "../../utils/sound";
import { useModalEntrance } from "../../utils/useModalEntrance";
import { HintModal } from "../ui/HintModal";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { CtfTabs, CtfTabPanel, CtfTab } from "../ctf/CtfTabs";
import { FlagSubmitForm } from "../ctf/FlagSubmitForm";
import { InvestigationNotes } from "../ctf/InvestigationNotes";
import { NodeInspector, RelayMap } from "./network/RelayNetwork";
import { CipherWorkbench } from "./network/CipherWorkbench";

interface Props {
  onClose: () => void;
}

type NetworkTab = "map" | "workbench" | "notes" | "submit";

const TABS: CtfTab<NetworkTab>[] = [
  { id: "map", label: "NODE MAP" },
  { id: "workbench", label: "WORKBENCH" },
  { id: "notes", label: "NOTES" },
  { id: "submit", label: "SUBMIT" },
];

const definition = CHALLENGES[CTF_02];

// CTF 02 — COMPROMISED NODE. Use the CTF 01 handoff to find the right relay, peel the packet's
// encoding, decrypt it, submit the flag it contains. Validation is behind submitChallenge().
export const NetworkMapModal: React.FC<Props> = ({ onClose }) => {
  const { networkUnlocked, challenge3Solved, handoff, reward, setActiveStation, audioEnabled } = useBlueZoneStore(
    useShallow((s) => ({
      networkUnlocked: s.networkUnlocked,
      challenge3Solved: s.challenge3Solved,
      handoff: s.challengeRewards[CTF_01],
      reward: s.challengeRewards[CTF_02],
      setActiveStation: s.setActiveStation,
      audioEnabled: s.audioEnabled,
    }))
  );
  const panelRef = useModalEntrance<HTMLDivElement>();

  const [tab, setTab] = useState<NetworkTab>(() => (challenge3Solved ? "submit" : "map"));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [workbenchInput, setWorkbenchInput] = useState("");
  const [showHint, setShowHint] = useState(false);

  const selectTab = (next: NetworkTab) => {
    if (next !== tab && audioEnabled) sound.playClick();
    setTab(next);
  };

  const handleSelectNode = (id: string) => {
    if (audioEnabled) sound.playClick();
    setSelectedNode(id);
  };

  // Lockout check
  if (!networkUnlocked) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
        <div ref={panelRef} className="relative w-full max-w-md bg-radio-panel border border-red-500/50 rounded-lg p-6 text-center font-mono text-radio-text shadow-red-glow">
          <Lock className="w-12 h-12 text-red-400 mx-auto mb-3 animate-pulse" />
          <div className="text-sm font-bold text-red-300 tracking-wider">
            STATION 04 // NETWORK MAP LOCKED
          </div>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Relay routing needs a confirmed source node. Reconstruct the intercepted transmission at Station 01 (Communication Terminal) first.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={() => {
                setActiveStation("communication-terminal");
              }}
              className="px-3 py-1.5 rounded bg-cyan-950/60 border border-cyan-500 text-cyan-300 text-xs font-bold hover:bg-cyan-900/60"
            >
              GO TO TERMINAL 01
            </button>
            <button
              onClick={() => {
                onClose();
              }}
              className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    );
  }

  const node = RELAY_NODES.find((n) => n.id === selectedNode) ?? null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div ref={panelRef} className="relative w-full max-w-5xl h-[85vh] bg-radio-panel border border-radio-cyan/40 rounded-lg shadow-cyan-glow flex flex-col overflow-hidden text-radio-text font-mono">

        {/* Header */}
        <div className="bg-radio-surface px-4 py-3 border-b border-radio-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Share2 className="w-4 h-4 shrink-0 text-radio-cyan" />
            <span className="text-sm font-bold text-radio-textBright tracking-wider truncate">
              STATION 04 // RELAY NETWORK MAP [RF-TOPO-04]
            </span>
            <span
              className={`hidden sm:inline shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${
                challenge3Solved
                  ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300"
                  : "border-cyan-500/40 bg-cyan-950/40 text-cyan-300"
              }`}
            >
              {challenge3Solved ? `${definition.label} SOLVED` : "INVESTIGATION ACTIVE"}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) sound.playClick();
                setShowHint(true);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-bold transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>REQUEST HINT</span>
            </button>
            <button
              onClick={() => {
                onClose();
              }}
              aria-label="Close station"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Case file: what CTF 01 handed over */}
        <div className="px-4 py-2 border-b border-radio-border bg-radio-dark/70 flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] tracking-[0.18em]">
          <span className="text-radio-cyan font-bold">
            {definition.label} // {definition.title}
          </span>
          <span className="text-radio-textMuted">
            SOURCE (TERMINAL 01): <span className="text-emerald-300 font-bold">{handoff?.source ?? "UNCONFIRMED"}</span>
          </span>
          <span className="text-radio-textMuted min-w-0">
            RECOVERED FRAGMENT:{" "}
            <span className="text-amber-200 tracking-wider break-all select-text">{handoff?.recoveredFragment ?? "—"}</span>
          </span>
        </div>

        <CtfTabs
          idPrefix="ctf02"
          label="Network Map investigation"
          tabs={TABS.map((t) => (t.id === "submit" && challenge3Solved ? { ...t, label: "ROUTE", marker: true } : t))}
          active={tab}
          onChange={selectTab}
        />

        <CtfTabPanel idPrefix="ctf02" active={tab}>
          {tab === "map" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 space-y-2">
                <RelayMap selectedId={selectedNode} onSelect={handleSelectNode} />
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-radio-textMuted">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500/70" />OFFLINE</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />DEGRADED</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-300" />INTERMITTENT</span>
                  <span>DASHED = LINK DOWN</span>
                </div>
              </div>
              <div className="md:col-span-5">
                <NodeInspector
                  node={node}
                  onSendToWorkbench={(payload) => {
                    setWorkbenchInput(payload);
                    selectTab("workbench");
                  }}
                />
              </div>
            </div>
          )}
          {/* Kept mounted so the bench keeps its operation/output while the player checks the map */}
          <div hidden={tab !== "workbench"}>
            <CipherWorkbench input={workbenchInput} onInputChange={setWorkbenchInput} fragment={handoff?.recoveredFragment} />
          </div>
          {tab === "notes" && (
            <InvestigationNotes
              challengeId={CTF_02}
              prompt="Track which node matches the source, what wraps its packet, and how the recovered fragment turns into a key."
            />
          )}
          {tab === "submit" &&
            (challenge3Solved ? (
              <div className="max-w-2xl p-5 rounded border border-emerald-500/50 bg-emerald-950/20 space-y-4">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm tracking-[0.2em]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>NETWORK ROUTE RESTORED</span>
                </div>
                <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2.5 text-xs">
                  <dt className="text-radio-textMuted tracking-wider">NODE</dt>
                  <dd className="text-emerald-200 font-bold tracking-wider">{reward?.source ?? "—"}</dd>
                  <dt className="text-radio-textMuted tracking-wider">COMMUNICATION</dt>
                  <dd className="text-radio-textBright font-bold tracking-wider">{reward?.communication ?? "DECRYPTED"}</dd>
                  {reward?.route && (
                    <>
                      <dt className="text-radio-textMuted tracking-wider">ROUTE</dt>
                      <dd className="text-radio-textBright tracking-wider">{reward.route}</dd>
                    </>
                  )}
                </dl>
                <div className="pt-3 border-t border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] text-emerald-400">NEXT OBJECTIVE: VOICE ARCHIVE // SIGNAL MONITOR</span>
                  <button
                    onClick={() => setActiveStation("voice-archive")}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-200 text-xs font-bold transition-colors"
                  >
                    <span>PROCEED TO VOICE ARCHIVE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  The decrypted communication ends with a confirmation string. Transmit it to restore the route.
                </p>
                <FlagSubmitForm challengeId={CTF_02} />
              </div>
            ))}
        </CtfTabPanel>
      </div>
      {showHint && (
        <HintModal
          challengeId={CTF_02}
          challengeTitle={`${definition.label} // ${definition.title}`}
          onClose={() => setShowHint(false)}
        />
      )}
    </div>
  );
};
