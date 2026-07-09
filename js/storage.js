// Tiny save system using localStorage. Fully offline.
const KEY = "kate-adventure-3-save";

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        scene: state.scene,
        inv: state.inv,
        flags: state.flags,
      })
    );
  } catch {
    /* storage may be blocked in private mode — game still works, just won't save */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
