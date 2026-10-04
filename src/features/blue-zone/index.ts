// Public entry point for the Blue Zone. Other zones and the parent app should import from here only.
export { BlueZone } from "./components/BlueZoneRoot";
export type { BlueZoneProps } from "./components/BlueZoneRoot";
export type { BlueZoneCompletionPayload } from "./types/integration.types";
export { BLUE_ZONE_COMPLETION } from "./data/completion";
