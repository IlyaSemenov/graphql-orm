import { ServerConfig, setup_client } from "./client"
import { setup_db } from "./db"

export async function setup(config: ServerConfig) {
	const [client, knex] = await Promise.all([setup_client(config), setup_db()])
	return { client, knex }
}
