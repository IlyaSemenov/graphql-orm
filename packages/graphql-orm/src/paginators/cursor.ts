import type { OrmAdapter } from "../orm/orm"

import type { PaginateContext, Paginator } from "./base"

export function defineCursorPaginator(
  options: Partial<CursorPaginatorOptions> = {},
) {
  return new CursorPaginator(options)
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

class CursorPaginator<Orm extends OrmAdapter, Context>
implements Paginator<Orm, Context> {
  readonly path = ["nodes"]
  readonly options: CursorPaginatorOptions

  readonly fields: Array<{
    name: string
    desc: boolean
  }>

  constructor(options: Partial<CursorPaginatorOptions> = {}) {
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

  paginate(query: Orm["Query"], context: PaginateContext<Orm, Context>) {
    const { orm } = context.graph
    const { args } = context.tree

    const take = (args.take as number | undefined) ?? this.options.take
    const cursor = args.cursor as string | undefined

    // Set query order
    query = orm.reset_query_order(query)
    for (const field of this.fields) {
      // TODO: prevent potential name clash with aliases like .as(`_${table_ref}_order_key_0`)
      query = orm.select_field(query, { field: field.name, as: field.name })
      query = orm.add_query_order(query, field.name, field.desc)
    }

    if (cursor) {
      const { expression, bindings } = this._parse_cursor(cursor)
      query = orm.where_raw(query, expression, bindings)
    }
    query = orm.set_query_limit(query, take + 1)

    return orm.set_query_page_result(query, (nodes) => {
      let cursor: string | undefined
      if (nodes.length > take) {
        cursor = this._create_cursor(nodes[take - 1])
        nodes = nodes.slice(0, take)
      }
      return { nodes, cursor }
    })
  }

  _create_cursor(instance: any) {
    return JSON.stringify(
      this.fields.map((field) => {
        const value = instance[field.name]
        if (value === undefined) {
          throw new Error(
            `Unable to create cursor: undefined field ${field.name}`,
          )
        }
        return String(value)
      }),
    )
  }

  _parse_cursor(cursor: string) {
    const values = JSON.parse(cursor)
    const left: string[] = []
    const right: string[] = []
    const bindings: Record<string, any> = {}
    for (let i = 0; i < this.fields.length; ++i) {
      const field = this.fields[i]
      const expressions = field.desc ? right : left
      const placeholders = field.desc ? left : right
      expressions.push(`"${field.name}"`)
      placeholders.push("$" + field.name)
      bindings[field.name] = values[i]
    }
    return {
      expression: `(${left.join(",")}) > (${right.join(",")})`,
      bindings,
    }
  }
}
