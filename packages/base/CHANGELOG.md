# graphql-orm

## 1.6.0

### Minor Changes

- e94f2f6: Export `filterQuery` function.

## 1.5.0

### Minor Changes

- f3f5f31: Type graph resolve result as `Promise<T>` instead of `Query`.

### Patch Changes

- e802bea: Return `Promise<undefined>` instead of `undefined` for non-requested fields.

## 1.4.1

### Patch Changes

- 05d7316: Revert inlining graphql-parse-resolve-info, bump its version instead.

## 1.4.0

### Minor Changes

- 262aa3e: Inline graphql-parse-resolve-info to prevent false peer dependency error in dependent packages.

## 1.3.2

### Patch Changes

- 2f28c2b: Support `modelField` in addition to `tableField` as per docs (fix #33).

## 1.3.1

### Patch Changes

- 2aa2a48: Fix root subfield lookup when the field was not requested by the client.

## 1.3.0

### Minor Changes

- 49ea582: Support resolving non-root GraphQL fields (#27).

### Patch Changes

- b10f1d2: Make GraphResolveOptions a <Context> generic.

## 1.2.0

### Minor Changes

- f90441e: Introduce `OrmAdapter` generic argument `QueryTransform`.

## 1.1.0

### Minor Changes

- 030b302: Define graph resolver context type and pass it to callbacks.

## 1.0.0

### Major Changes

- 463ebee: Merge objection-graphql-resolver and orchid-orm, extract common core to graphql-orm.
