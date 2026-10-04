# Blue Zone — Integration Contract

Radio Communication Sector. Self-contained first-person CTF investigation (3 challenges + Emergency Broadcast reveal).

## Route & entry point

| | |
|---|---|
| Route | `/blue-zone` → `app/blue-zone/page.tsx` |
| Public entry | `src/features/blue-zone/index.ts` (import **only** from `@/features/blue-zone`) |
| Main component | `BlueZone` (`components/BlueZoneRoot.tsx`, a client component) |

```ts
export { BlueZone, BLUE_ZONE_COMPLETION } from "@/features/blue-zone";
export type { BlueZoneProps, BlueZoneCompletionPayload } from "@/features/blue-zone";
```

## Props

```ts
interface BlueZoneProps {
  onComplete?: (payload: BlueZoneCompletionPayload) => void; // fired once, after the final reveal
  onExit?: () => void;                                       // player pressed EXIT HUB
}
```

Blue Zone **never navigates**. The parent decides what happens after `onComplete` / `onExit`.
A zero-argument `onComplete={() => ...}` is still valid.

## Completion payload

Sent once when the Emergency Broadcast sequence reaches `COMPLETE`:

```ts
{
  event: "BLUE_ZONE_COMPLETE",
  zone: "blue-zone",
  nextSector: "FORENSICS",
  broadcast: { source: "AUTOMATIC SYSTEM", trigger: "UNAUTHORIZED ACCESS", origin: "FORENSICS EVIDENCE VAULT" },
  evidence: {
    transmitter:        { sanctuaryId: "SANC-0003", sector: "Radio" },
    failedTransmission: { logId: "FAIL-LOG-02", carrierMhz: 156.3 },
    networkRoute:       { radioNexusId: "SANC-0002", forensicsGatewayId: "SANC-0034" },
  },
}
```

- Exactly what the player sees on the final screen and the Investigation Board. Nothing new.
- `SANC-0003` (Radio), `SANC-0002` (Radio) and `SANC-0034` (Forensics) match `radioGroundTruth.json`. `FAIL-LOG-02` and `156.3` are in-game evidence IDs, not dataset fields.
- For Forensics, the useful hand-off values are `broadcast.origin` (FORENSICS EVIDENCE VAULT) and `networkRoute.forensicsGatewayId` (SANC-0034).
- No score, time or attempt counts are reported (by design: no scoring).

## Integration example

Function props can't cross the server/client boundary, so the parent must be a client component:

```tsx
"use client";
import { useRouter } from "next/navigation";
import { BlueZone, type BlueZoneCompletionPayload } from "@/features/blue-zone";

export default function BlueZoneStage() {
  const router = useRouter();
  const handleComplete = (result: BlueZoneCompletionPayload) => {
    // e.g. store result.evidence for Forensics, then advance when the parent decides
  };
  return <BlueZone onComplete={handleComplete} onExit={() => router.push("/")} />;
}
```

## Internal state (do not import)

`store/useBlueZoneStore.ts` (zustand) is **internal**. It holds progression flags, station/modal state, the timer, hints, failed attempts, logs and cinematic stage. Other zones should rely on the `onComplete` payload, not the store.

- The raw dataset (`data/radioGroundTruth.json`, 120 rows) is ground truth only. It is not imported by any component and is not in the client bundle. Never expose it.
- The store is a module singleton: progress persists if `<BlueZone>` unmounts and remounts in the same page session (no public reset yet).

## External dependencies

Used by Blue Zone: `react`, `next` (`next/dynamic`), `three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `zustand` (incl. `zustand/react/shallow`), `lucide-react`.
No backend, database, network calls or audio assets.

Shared config Blue Zone relies on (keep when merging):

- `tailwind.config.js`: `content` must include `./src/**`. Needs the `radio.*` colour palette, the `cyan/amber/red-glow` shadows, and the `scanline` keyframes/animation.
- `next.config.mjs`: `transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"]`.
- `tsconfig.json`: path alias `@/*` → `./src/*`.

## Files

**Do not modify (Blue Zone owned):** everything under `src/features/blue-zone/`, especially `data/radioGroundTruth.json`, `data/challenges.ts`, `data/hints.ts`, `utils/validation.ts`, `store/useBlueZoneStore.ts`.

**Safe to modify:**
- `app/blue-zone/page.tsx`: the mount point (wrap it, pass `onComplete` / `onExit`).
- `data/config.ts` → `SESSION_TIME_LIMIT_SECONDS`: the session length knob.

**Shared files with Blue Zone-specific content (resolve at merge, not changed here):**
- `app/layout.tsx`: metadata title/description are Blue Zone-specific, and it sets `<html class="dark">` plus body background classes.
- `app/page.tsx`: redirects `/` to `/blue-zone`. The integrated app will want its own root.
- `app/globals.css`: Blue Zone needs only the body background/mono font. The scrollbar styling and `body { overflow-x: hidden }` are global.

## Known limitations

- **Full-viewport layout.** It assumes it owns the viewport: `h-screen` layout, fixed modals up to `z-[110]`, and a fixed CRT overlay at `z-[120]`. Mount it on its own page, not inside other chrome.
- **No public reset.** The store singleton has no reset exposed through `index.ts`.
- **Pointer lock.** Verified in a real desktop browser. Browsers may refuse a re-lock requested immediately after ESC; the "click to resume" banner stays until a later click succeeds.
- **Label occlusion.** World-space labels use drei `occlude` and can flicker at the exact edge of a console.
- **Unused dependencies.** `clsx` and `tailwind-merge` are in `package.json` but unused by Blue Zone.
