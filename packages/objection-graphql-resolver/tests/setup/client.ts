import { GraphQLClient } from "graphql-request"

import { create_server, ServerConfig } from "./apollo"

export async function create_client(config: ServerConfig) {
  const url = await create_server(config)
  return new GraphQLClient(url)
}
