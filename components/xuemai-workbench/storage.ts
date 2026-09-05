import { initialState } from "./mock-data";
import { parseWorkbenchStoragePayload, stringifyWorkbenchStoragePayload } from "./persistence";
import type { ChatState } from "./types";

export const storageKey = "xuemai_chat_engine_v1";

export function loadStoredState(): ChatState {
  if (typeof window === "undefined") return initialState;

  try {
    return parseWorkbenchStoragePayload(window.localStorage.getItem(storageKey));
  } catch {
    return initialState;
  }
}

export function saveStoredState(state: ChatState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, stringifyWorkbenchStoragePayload(state));
  } catch {
    // Keep the workbench usable even if localStorage is blocked or full.
  }
}
