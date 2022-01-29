const { gql, ApolloServer } = require("apollo-server");
const { Neo4jGraphQL } = require("@neo4j/graphql");
const neo4j = require("neo4j-driver");
require("dotenv").config();

const typeDefs = gql`
  type Todo {
    text: String!
    checked: Boolean @default(value: false)
  }
  
  type TodoList {
    name: String!
    todos: [Todo] @relationship(type: "BELONGS_TO", direction: IN)
  } 

  type User {
    name: String!
    email: String!
    todoLists: [TodoList] @relationship(type: "CREATED_BY", direction: OUT)
  }
`;

const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const neoSchema = new Neo4jGraphQL({ typeDefs, driver });

const server = new ApolloServer({
    schema: neoSchema.schema,
});

server.listen().then(({ url }) => {
    console.log(`GraphQL server ready on ${url}`);
});