import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// RTL's automatic cleanup only registers itself when afterEach is a global,
// which vitest does not provide unless `globals: true` - so register it here.
afterEach(cleanup);
