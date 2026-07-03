// Device identity: a per-device uuid plus a self-chosen display name, stamped
// on every op so people sharing a list (same account, different devices) can
// see who changed what. Trust-based, no auth. Persisted in localStorage.

const STORAGE_KEY = "todos.identity.v1";

export type Identity = {
  deviceId: string;
  // null until the user picks a name (or skips, which sets an auto-name)
  deviceName: string | null;
};

function read(): Partial<Identity> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Identity>) : {};
  } catch {
    return {};
  }
}

function write(identity: Identity): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

// A fallback name for users who skip the prompt, e.g. "device-1a2b".
export function autoName(deviceId: string): string {
  return `device-${deviceId.slice(0, 4)}`;
}

// Returns the persisted deviceId, generating and storing one on first call.
export function ensureDeviceId(): string {
  const current = read();
  if (current.deviceId) return current.deviceId;
  const deviceId = crypto.randomUUID();
  write({ deviceId, deviceName: current.deviceName ?? null });
  return deviceId;
}

export function getIdentity(): Identity {
  const deviceId = ensureDeviceId();
  return { deviceId, deviceName: read().deviceName ?? null };
}

export function setDeviceName(name: string): void {
  const deviceId = ensureDeviceId();
  write({ deviceId, deviceName: name.trim() });
}

// Called when the user skips naming their device: assign the auto-name so the
// prompt won't reappear.
export function skipDeviceName(): void {
  const deviceId = ensureDeviceId();
  write({ deviceId, deviceName: autoName(deviceId) });
}
