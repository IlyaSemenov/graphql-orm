import { ServerConfig, setup_client } from "./client"
import { setup_db } from "./db"

export async function setup(tap: Tap.Test, config: ServerConfig) {
	const [client, knex] = await Promise.all([
		setup_client(tap, config),
		setup_db(tap),
	])
	return { client, knex }
}
