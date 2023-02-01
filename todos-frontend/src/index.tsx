import * as React from "react";
import ReactDOM from "react-dom";
import { App } from "./App";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";

const client = new ApolloClient({
  uri: "http://localhost:4000/subscriptions",
  cache: new InMemoryCache(),
});
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";

// const link = new GraphQLWsLink(
//   createClient({
//     url: "ws://localhost:4000/subscriptions",
//   })
// );

// const client = new ApolloClient({
//   link: link,
//   cache: new InMemoryCache(),
// });

ReactDOM.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById("app")
);
