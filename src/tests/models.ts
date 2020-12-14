import Knex from "knex"
import { Model, QueryBuilder, raw } from "objection"
import { assert } from "tap"

export class UserModel extends Model {
	static tableName = "users"
	static get relationMappings() {
		return {
			posts: {
				relation: Model.HasManyRelation,
				modelClass: PostModel,
				join: { from: "posts.author_id", to: "users.id" },
			},
			default_section: {
				relation: Model.BelongsToOneRelation,
				modelClass: SectionModel,
				join: { from: "users.default_section_id", to: "sections.id" },
			},
		}
	}

	static modifiers = {
		"graphql.select.upper_name": (query: QueryBuilder<UserModel>) =>
			query.select(raw("upper(name) as upper_name")),
	}

	declare id: number
	declare name: string
	declare readonly upper_name: string
	declare password: string
	declare posts: PostModel[]
	declare default_section_id: number
	declare default_section: SectionModel
}

export class SectionModel extends Model {
	static tableName = "sections"
	static get relationMappings() {
		return {
			posts: {
				relation: Model.HasManyRelation,
				modelClass: PostModel,
				join: { from: "posts.section_id", to: "sections.id" },
			},
		}
	}

	static modifiers = {
		"graphql.top": (query: QueryBuilder<UserModel>) =>
			query.where("is_hidden", false),
		"graphql.many": (query: QueryBuilder<UserModel>) => query.orderBy("name"),
	}

	declare id: number
	declare slug: string
	declare name: string
	declare is_hidden: boolean
	declare posts: PostModel[]
}

export class PostModel extends Model {
	static tableName = "posts"
	static get relationMappings() {
		return {
			author: {
				relation: Model.BelongsToOneRelation,
				modelClass: UserModel,
				join: { from: "posts.author_id", to: "users.id" },
			},
			section: {
				relation: Model.BelongsToOneRelation,
				modelClass: SectionModel,
				join: { from: "posts.section_id", to: "sections.id" },
			},
		}
	}

	static modifiers = {
		published(query: QueryBuilder<PostModel>) {
			query.whereNotNull("section_id")
		},
		search(query: QueryBuilder<PostModel>, term: string) {
			query.where("title", "like", `%${term}%`)
		},
		under_default_section(
			query: QueryBuilder<PostModel>,
			{ user_id }: { user_id: string },
		) {
			query.runBefore(async function () {
				const { default_section_id } = await UserModel.query(
					this.context().transaction,
				).findById(user_id)
				this.where("section_id", default_section_id)
			})
		},
		"graphql.select.url": (query: QueryBuilder<PostModel>) =>
			query
				.select("title")
				.withGraphFetched("section(section_slug)")
				.modifiers({
					section_slug: (query) => query.select("slug"),
				}),
	}

	declare id: number
	declare title: string | null
	declare text: string | null
	declare author: UserModel
	declare section: SectionModel

	get url() {
		assert(
			this.id !== undefined &&
				this.title !== undefined &&
				(this.section === null || this.section?.slug !== undefined),
		)
		return (
			(this.section ? `/${this.section.slug}` : "") +
			`/${this.title}-${this.id}`
		)
	}
}

export async function create_tables(knex: Knex) {
	await knex.schema.createTable("users", function (table) {
		table.integer("id").primary()
		table.string("name")
		table.string("password")
	})
	await knex.schema.createTable("sections", function (table) {
		table.integer("id").primary()
		table.string("slug").notNullable().unique()
		table.string("name")
		table.boolean("is_hidden").notNullable().defaultTo(false)
	})
	await knex.schema.alterTable("users", function (table) {
		table.integer("default_section_id")
		table.foreign("default_section_id").references("id").inTable("sections")
	})
	await knex.schema.createTable("posts", function (table) {
		table.integer("id").primary()
		table.string("title")
		table.string("text")
		table.integer("author_id").notNullable()
		table.foreign("author_id").references("id").inTable("users")
		table.integer("section_id")
		table.foreign("section_id").references("id").inTable("sections")
	})
}
