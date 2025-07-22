import { GraphQLClient } from "graphql-request"

import type { ServerConfig } from "./apollo"
import { createServer } from "./apollo"

export async function createClient(config: ServerConfig) {
	const url = await createServer(config)
	return new GraphQLClient(url)
}
