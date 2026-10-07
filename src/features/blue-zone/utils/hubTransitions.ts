// Exit transition hook-up between the status bar's EXIT HUB button and RadioHub.
// RadioHub registers a handler that plays a short shutdown (world energy fades, HUD fades) and
// then calls done(); without a handler, done() runs immediately. The exit itself is unchanged:
// done() performs exactly the same exitHub() + onExit() calls as before, just after the fade.

type ExitHandler = (done: () => void) => void;

let handler: ExitHandler | null = null;
let exiting = false;

export function setHubExitHandler(next: ExitHandler) {
  handler = next;
  exiting = false;
  return () => {
    if (handler === next) handler = null;
    exiting = false;
  };
}

export function requestHubExit(done: () => void) {
  if (exiting) return; // ignore repeat clicks during the fade
  if (!handler) {
    done();
    return;
  }
  exiting = true;
  handler(() => {
    exiting = false;
    done();
  });
}
