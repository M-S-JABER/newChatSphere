export type CallLogEntry = {
  id: string;
  conversationId?: string | null;
  phone: string;
  displayName: string;
  direction: "incoming" | "outgoing";
  outcome: "completed" | "missed" | "declined" | "cancelled";
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
};

export const CALL_LOG_STORAGE_KEY = "chatsphere:call-log:v1";
export const CALL_LOG_MAX_ENTRIES = 200;
export const CALL_LOG_UPDATED_EVENT = "chatsphere:call-log-updated";

const isValidEntry = (entry: any): entry is CallLogEntry =>
  entry &&
  typeof entry.id === "string" &&
  typeof entry.phone === "string" &&
  typeof entry.displayName === "string" &&
  (entry.direction === "incoming" || entry.direction === "outgoing") &&
  typeof entry.startedAt === "number" &&
  typeof entry.endedAt === "number";

export const readCallLog = (): CallLogEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CALL_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry);
  } catch {
    return [];
  }
};

export const writeCallLog = (entries: CallLogEntry[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CALL_LOG_STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event(CALL_LOG_UPDATED_EVENT));
  } catch {
    // Ignore storage failures.
  }
};

export const appendCallLog = (
  entry: CallLogEntry,
  current?: CallLogEntry[],
): CallLogEntry[] => {
  const base = Array.isArray(current) ? current : readCallLog();
  const next = [entry, ...base].slice(0, CALL_LOG_MAX_ENTRIES);
  writeCallLog(next);
  return next;
};
