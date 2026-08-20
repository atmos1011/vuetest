import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw/server";

// Start the mock API server for every test file, reset handlers between
// tests so one test's mock doesn't leak into the next, and shut down after
// the whole run.
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());
