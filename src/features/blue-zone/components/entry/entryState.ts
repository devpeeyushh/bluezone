// Render-only state shared between the landing UI (DOM) and the landing scene (R3F).
// Mutated directly by event handlers and read inside useFrame — never React state, so pointer
// movement and hover never cause re-renders.

export const entryState = {
  // Normalised pointer position, -1..1 (0 = centre)
  pointerX: 0,
  pointerY: 0,
  // ENTER FACILITY hover / focus (0 or 1; the scene eases toward it)
  hover: 0,
  // Set when ENTER FACILITY is pressed: the camera moves in and the transmission intensifies
  entering: false,
};

export function resetEntryState() {
  entryState.pointerX = 0;
  entryState.pointerY = 0;
  entryState.hover = 0;
  entryState.entering = false;
}

// Duration of the landing → facility transition (seconds)
export const ENTER_DURATION = 1.0;
export const ENTER_DURATION_REDUCED = 0.25;
