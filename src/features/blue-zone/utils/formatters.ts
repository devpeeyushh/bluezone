export function formatStatusBadge(status: string): { text: string; bg: string } {
  switch (status) {
    case "AVAILABLE":
    case "ACTIVE":
      return { text: "text-radio-cyan", bg: "border-cyan-500/40 bg-cyan-950/30" };
    case "PARTIAL DATA":
    case "PARTIAL CONNECTION":
      return { text: "text-cyan-300", bg: "border-cyan-600/40 bg-cyan-950/20" };
    case "DEGRADED":
      return { text: "text-amber-400", bg: "border-amber-500/40 bg-amber-950/30" };
    case "LOCKED":
    case "TRANSMISSION FAILED":
    case "DATA LOST":
      return { text: "text-red-400", bg: "border-red-500/40 bg-red-950/30" };
    default:
      return { text: "text-slate-400", bg: "border-slate-600/40 bg-slate-900/30" };
  }
}
