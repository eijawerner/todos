import * as React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { outbox } from "./sync/outbox";

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: 1,
    },
  },
});

// After each successful outbox flush, refetch todos so the server's canonical
// state (incl. other devices' edits) replaces the local overlay.
outbox.setOnFlushed(() => queryClient.invalidateQueries({ queryKey: ["todos"] }));

const container = document.getElementById("app");
const root = createRoot(container!);
root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);