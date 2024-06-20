import { GraphQLClient } from "graphql-request"

import type { ServerConfig } from "./apollo"
import { create_server } from "./apollo"

export async function create_client(config: ServerConfig) {
  const url = await create_server(config)
  return new GraphQLClient(url)
}
