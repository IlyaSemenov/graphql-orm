import { Model, QueryBuilder, raw } from "objection"

import { field_ref } from "../helpers/field-ref"
import { Paginator } from "./base"

export function create_cursor_paginator<M extends Model>(
	options: Partial<CursorPaginatorOptions> = {}
) {
	return new CursorPaginator<M>(options)
}

export interface CursorPaginatorOptions {
	fields: string[]
	take: number
}

export interface CursorPaginatorArgs {
	cursor?: string
	take?: number
}

export interface CursorPaginatorPage<M> {
	nodes: M[]
	cursor?: string
}

class CursorPaginator<M extends Model> extends Paginator<
	M,
	CursorPaginatorPage<M>
> {
	readonly path = ["nodes"]
	readonly options: CursorPaginatorOptions

	readonly fields: Array<{
		name: string
		desc: boolean
	}>

	constructor(options: Partial<CursorPaginatorOptions> = {}) {
		super()
		this.options = {
			fields: ["id"],
			take: 10,
			...options,
		}
		this.fields = this.options.fields.map((field) => {
			if (field.startsWith("-")) {
				return { name: field.slice(1), desc: true }
			} else {
				return { name: field, desc: false }
			}
		})
	}

	paginate(query: QueryBuilder<M, M[]>, args: CursorPaginatorArgs = {}) {
		const take = args.take ?? this.options.take
		const { cursor } = args

		// Set query order
		query.clearOrder()
		for (const field of this.fields) {
			const f = field_ref(query, field.name)
			// TODO: prevent potential name clash with aliases like .as(`_${table_ref}_order_key_0`)
			query.select(f).orderBy(f, field.desc ? "desc" : "asc")
		}

		if (cursor) {
			this._set_query_cursor(query, cursor)
		}
		query.limit(take + 1)

		query.runAfter((nodes) => {
			if (!Array.isArray(nodes)) {
				throw new Error(`Paginator called for single result query.`)
			}
			let cursor: string | undefined
			if (nodes.length > take) {
				cursor = this._create_cursor(nodes[take - 1])
				nodes = nodes.slice(0, take)
			}
			return { nodes, cursor }
		})
		return query as unknown as QueryBuilder<M, CursorPaginatorPage<M>>
	}

	_create_cursor(instance: any) {
		return JSON.stringify(
			this.fields.map((field) => {
				const value = instance[field.name]
				if (value === undefined) {
					throw new Error(
						`Unable to create cursor: undefined field ${field.name}`
					)
				}
				return String(value)
			})
		)
	}

	_set_query_cursor(query: QueryBuilder<M, M[]>, cursor: string) {
		const values = JSON.parse(cursor)
		type P = [string, any]
		const left: P[] = []
		const right: P[] = []
		// TODO: refactor
		for (let i = 0; i < this.fields.length; ++i) {
			const field = this.fields[i]
			const field_part = field.desc ? right : left
			const value_part = field.desc ? left : right
			field_part.push(["??", field.name])
			value_part.push(["?", values[i]])
		}
		const get_placeholders = (pairs: P[]) => pairs.map(([p]) => p)
		const get_values = (pairs: P[]) => pairs.map(([, v]) => v)
		const cond = raw(
			`(${get_placeholders(left).join(",")}) > (${get_placeholders(right).join(
				","
			)})`,
			...get_values(left),
			...get_values(right)
		)
		query.where(cond)
	}
}
