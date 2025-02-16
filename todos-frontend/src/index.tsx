import * as React from "react";
import { createRoot } from 'react-dom/client';
import { App } from "./App";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";

// TODO cleanup
const apolloServerUrl: string =
  typeof import.meta.env.VITE_BACKEND_URL === "string"
    ? import.meta.env.VITE_BACKEND_URL
    : "http://localhost:4000";
const client = new ApolloClient({
  uri: apolloServerUrl,
  cache: new InMemoryCache(),
});

const container = document.getElementById("app");
const root = createRoot(container!);
root.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);
