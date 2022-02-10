import { Model } from "objection"

export async function create_tables() {
	const knex = Model.knex()

	await knex.schema.createTable("users", function (table) {
		table.integer("id").primary()
		table.string("name").notNullable()
		table.string("password").notNullable()
		table.integer("default_section_id")
		table.foreign("default_section_id").references("id").inTable("sections")
	})

	await knex.schema.createTable("sections", function (table) {
		table.integer("id").primary()
		table.string("slug").notNullable().unique()
		table.string("name").notNullable()
	})

	await knex.schema.createTable("posts", function (table) {
		table.integer("id").primary()
		table.string("text").notNullable()
		table.boolean("is_published").notNullable().defaultTo(true)
		table.integer("author_id").notNullable()
		table.foreign("author_id").references("id").inTable("users")
		table.integer("section_id").notNullable()
		table.foreign("section_id").references("id").inTable("sections")
	})
}
