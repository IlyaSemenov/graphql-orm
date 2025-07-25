# objection-graphql-resolver

## 7.6.1

### Patch Changes

- 312b2f7: Allow null and undefined as filter value.

## 7.6.0

### Minor Changes

- e94f2f6: Export `filterQuery` function.

## 7.5.1

### Patch Changes

- 555419a: Add proper `exports` section to `package.json`. Allow native ESM import of this module.

## 7.5.0

### Minor Changes

- 0ca55fb: Refactor cursor pagination:

  - Expect explicit list of fields to sort on.
  - If not provided, take the list of sort fields from the query itself.
  - Fix crash on naming clash when e.g. paginating over `id` with subquery also having `id`.

### Patch Changes

- 8d7c54c: Run subquery modify prior to applying pagination.

## 7.4.0

### Minor Changes

- f3f5f31: Type graph resolve result as `Promise<T>` instead of `Query`.

### Patch Changes

- e802bea: Return `Promise<undefined>` instead of `undefined` for non-requested fields.

## 7.3.1

### Patch Changes

- 05d7316: Revert inlining graphql-parse-resolve-info, bump its version instead.

## 7.3.0

### Minor Changes

- 262aa3e: Inline graphql-parse-resolve-info to prevent false peer dependency error in dependent packages.

## 7.2.2

### Patch Changes

- 2f28c2b: Support `modelField` in addition to `tableField` as per docs (fix #33).

## 7.2.1

### Patch Changes

- 2aa2a48: Fix root subfield lookup when the field was not requested by the client.

## 7.2.0

### Minor Changes

- 49ea582: Support resolving non-root GraphQL fields (#27).

### Patch Changes

- b10f1d2: Make GraphResolveOptions a <Context> generic.

## 7.1.0

### Minor Changes

- 030b302: Define graph resolver context type and pass it to callbacks.

## 7.0.0

### Major Changes

- 463ebee: Merge objection-graphql-resolver and orchid-orm, extract common core to graphql-orm.
