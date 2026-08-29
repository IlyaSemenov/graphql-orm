import { Buffer } from "node:buffer"

import type { AnyQueryBuilder, Model } from "objection"
import { raw, ref } from "objection"

export interface CursorOrder {
	field: string
	dir: "ASC" | "DESC"
}

export interface CursorPaginationOptions {
	cursor?: string
	fields?: CursorOrder[]
	limit: number
}

export interface CursorPaginationPage {
	items: any[]
	nextCursor?: string
}

export interface PreparedCursorPagination {
	query: AnyQueryBuilder
	finalize(items: any[]): CursorPaginationPage
}

export function prepareCursorPagination(
	query: AnyQueryBuilder,
	options: CursorPaginationOptions,
): PreparedCursorPagination {
	const orderFields = getOrderFields(query, options.fields)

	if (!orderFields.length) {
		throw new Error("Query must be ordered.")
	}

	if (options.fields) {
		query = query.clearOrder()
	}

	const fields = orderFields.map(order => ({
		...order,
		alias: "_order_" + order.field,
	}))

	for (const { field, alias, dir } of fields) {
		query = query.select(fieldRef(query, field).as(alias))
		if (options.fields) {
			query = query.orderBy(alias, dir)
		}
	}

	if (options.cursor) {
		const parts = parseCursor(options.cursor)
		const left: string[] = []
		const right: string[] = []
		const table = query.modelClass().tableName

		for (const { field, alias, dir } of fields) {
			const [expressions, placeholders]
				= dir === "ASC" ? [left, right] : [right, left]
			expressions.push(`"${table}"."${field}"`)
			placeholders.push("$" + alias)
		}

		const expression = `(${left.join(",")}) > (${right.join(",")})`
		const bindings = Object.fromEntries(
			fields.map(({ alias }, i) => [alias, parts[i]]),
		)
		query = query.where(raw(expression.replace(/\$/g, ":"), bindings))
	}

	query = query.limit(options.limit + 1)

	return {
		query,
		finalize(items) {
			let nextCursor: string | undefined
			if (items.length > options.limit) {
				const item = items[options.limit - 1]
				nextCursor = createCursor(fields.map(({ field, alias }) => {
					const value = item[alias]
					if (value === undefined) {
						throw new Error(
							`Unable to create cursor: undefined field ${field} (${alias})`,
						)
					}
					return String(value)
				}))
				items = items.slice(0, options.limit)
			}
			return { items, nextCursor }
		},
	}
}

function getOrderFields(
	query: AnyQueryBuilder,
	fields: CursorOrder[] | undefined,
): CursorOrder[] {
	if (fields) {
		return fields
	}

	const orders: CursorOrder[] = []
	;(query as any).forEachOperation(/orderBy/, (operation: any) => {
		if (operation.name === "orderBy") {
			const [field, direction = "ASC"] = operation.args
			const dir = String(direction).toUpperCase()
			if (dir !== "ASC" && dir !== "DESC") {
				throw new Error("Unsupported order: " + direction)
			}
			orders.push({ field, dir })
		}
	})
	return orders
}

function fieldRef(query: AnyQueryBuilder, field: string) {
	return ref(field).from(query.tableRefFor(query.modelClass() as typeof Model))
}

function createCursor(parts: string[]) {
	return Buffer.from(parts.join(String.fromCharCode(0))).toString("base64url")
}

function parseCursor(cursor: string): string[] {
	return Buffer.from(cursor, "base64url")
		.toString()
		.split(String.fromCharCode(0))
}
