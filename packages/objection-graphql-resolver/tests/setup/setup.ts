import type { ServerConfig } from "./apollo"
import { create_client } from "./client"
import { setup_db } from "./db"

export async function setup(config: ServerConfig) {
  const [client, knex] = await Promise.all([create_client(config), setup_db()])
  return { client, knex }
}
