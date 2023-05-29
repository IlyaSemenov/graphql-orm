// Demo test for https://github.com/IlyaSemenov/objection-graphql-resolver/issues/9

import gql from "graphql-tag"
import { Model } from "objection"
import * as r from "objection-graphql-resolver"
import { assert, test } from "vitest"

import { Resolvers, setup } from "../setup"

class CompanyModel extends Model {
	static tableName = "company"

	static get relationMappings() {
		return {
			offices: {
				relation: Model.HasManyRelation,
				modelClass: OfficeModel,
				join: {
					from: "company.id",
					to: "office.company_id",
				},
			},
		}
	}

	id?: number
	name?: string
	offices?: OfficeModel[]
}

class OfficeModel extends Model {
	static tableName = "office"

	static get relationMappings() {
		return {
			staffMembers: {
				relation: Model.HasManyRelation,
				modelClass: StaffModel,
				join: {
					from: "office.id",
					to: "staff.office_id",
				},
			},
		}
	}

	id?: number
	name?: string
	staffMembers?: StaffModel[]
}

class StaffModel extends Model {
	static tableName = "staff"

	static get relationMappings() {
		return {
			expenses: {
				relation: Model.HasManyRelation,
				modelClass: ExpenseModel,
				join: {
					from: "staff.id",
					to: "expense.staff_id",
				},
			},
		}
	}

	id?: number
	name?: string
	expenses?: ExpenseModel[]
}

class ExpenseModel extends Model {
	static tableName = "expense"

	id?: number
	amount?: number
	status?: "pending" | "complete"
}

const schema = gql`
	type Company {
		id: Int!
		name: String!
		offices: [Office!]!
	}

	type Office {
		id: Int!
		name: String!
		staffMembers: [Staff!]!
	}

	type Staff {
		id: Int!
		name: String!
		expenses(filter: Filter): [Expense!]!
	}

	type Expense {
		id: Int!
		amount: Float!
		status: String!
	}

	type Query {
		companies: [Company!]!
	}

	scalar Filter
`

const graph = r.graph({
	Company: r.model(CompanyModel),
	Office: r.model(OfficeModel),
	Staff: r.model(StaffModel, {
		fields: {
			name: true,
			expenses: r.relation({ filters: true }),
		},
	}),
	Expense: r.model(ExpenseModel),
})

const resolvers: Resolvers = {
	Query: {
		companies: (_parent, _args, context, info) =>
			graph.resolve(CompanyModel.query().orderBy("id"), { context, info }),
	},
}

const { client, knex } = await setup({ typeDefs: schema, resolvers })

await knex.schema.createTable("company", (author) => {
	author.increments("id")
	author.string("name").notNullable()
})
await knex.schema.createTable("office", (office) => {
	office.increments("id")
	office.string("name").notNullable()
	office
		.integer("company_id")
		.notNullable()
		.references("company.id")
		.onDelete("cascade")
		.index()
})
await knex.schema.createTable("staff", (staff) => {
	staff.increments("id")
	staff.string("name").notNullable()
	staff
		.integer("office_id")
		.notNullable()
		.references("office.id")
		.onDelete("cascade")
		.index()
})
await knex.schema.createTable("expense", (expense) => {
	expense.increments("id")
	expense.float("amount").notNullable()
	expense.string("status").notNullable()
	expense
		.integer("staff_id")
		.notNullable()
		.references("staff.id")
		.onDelete("cascade")
		.index()
})

test("filter expenses", async () => {
	await CompanyModel.query().insertGraph([
		{
			name: "ACME",
			offices: [
				{
					name: "Main",
					staffMembers: [
						{
							name: "Alice",
							expenses: [
								{ amount: 100, status: "complete" },
								{ amount: 200, status: "pending" },
								{ amount: 300, status: "complete" },
							],
						},
					],
				},
			],
		},
	])

	assert.deepEqual(
		await client.request(
			gql`
				query {
					companies {
						offices {
							staffMembers {
								name
								expenses(filter: { status: "pending" }) {
									id
									status
								}
							}
						}
					}
				}
			`
		),
		{
			companies: [
				{
					offices: [
						{
							staffMembers: [
								{
									name: "Alice",
									expenses: [{ id: 2, status: "pending" }],
								},
							],
						},
					],
				},
			],
		}
	)
})
