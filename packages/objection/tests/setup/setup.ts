import type { ServerConfig } from "./apollo"
import { createClient } from "./client"
import { setupDb } from "./db"

export async function setup(config: ServerConfig) {
	const [client, knex] = await Promise.all([createClient(config), setupDb()])
	return { client, knex }
}
