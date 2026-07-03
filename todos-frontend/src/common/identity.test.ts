import { it, expect, beforeEach } from "vitest";
import {
  ensureDeviceId,
  getIdentity,
  setDeviceName,
  skipDeviceName,
  autoName,
} from "./identity";

beforeEach(() => {
  localStorage.clear();
});

it("generates and persists a stable deviceId", () => {
  const first = ensureDeviceId();
  expect(first).toBeTruthy();
  expect(ensureDeviceId()).toBe(first); // stable across calls
});

it("starts with no device name", () => {
  const identity = getIdentity();
  expect(identity.deviceId).toBeTruthy();
  expect(identity.deviceName).toBeNull();
});

it("persists a trimmed device name", () => {
  setDeviceName("  Eija  ");
  expect(getIdentity().deviceName).toBe("Eija");
});

it("keeps the same deviceId when the name is set", () => {
  const id = ensureDeviceId();
  setDeviceName("Eija");
  expect(getIdentity().deviceId).toBe(id);
});

it("assigns an auto-name when skipped", () => {
  const id = ensureDeviceId();
  skipDeviceName();
  expect(getIdentity().deviceName).toBe(autoName(id));
  expect(getIdentity().deviceName).toBe(`device-${id.slice(0, 4)}`);
});

it("survives a round-trip through localStorage", () => {
  setDeviceName("Eija");
  const { deviceId } = getIdentity();

  // Simulate a fresh page load: identity is re-read from storage, not memory.
  expect(getIdentity()).toEqual({ deviceId, deviceName: "Eija" });
});

it("recovers a fresh identity from corrupt storage", () => {
  localStorage.setItem("todos.identity.v1", "not json");
  const identity = getIdentity();
  expect(identity.deviceId).toBeTruthy();
  expect(identity.deviceName).toBeNull();
});
