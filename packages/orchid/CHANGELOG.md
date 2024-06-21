# orchid-graphql

## 1.6.0

### Minor Changes

- d527653: Type graph resolve result as `Promise<T>` instead of `Query`.
- d527653: Return `Promise<undefined>` instead of `undefined` for non-requested fields.

## 1.5.2

### Patch Changes

- 91c309d: Remove dependency on `pqb`.

## 1.5.1

### Patch Changes

- 05d7316: Revert inlining graphql-parse-resolve-info, bump its version instead.

## 1.5.0

### Minor Changes

- 262aa3e: Inline graphql-parse-resolve-info to prevent false peer dependency error in dependent packages.

## 1.4.5

### Patch Changes

- 4b34b55: Compatibility with latest Orchid (1.23).

## 1.4.4

### Patch Changes

- 0e6c235: Update to work with pqb 0.21

## 1.4.3

### Patch Changes

- 4a74f52: Allow pqb 0.18

## 1.4.2

### Patch Changes

- 93c3113: Allow pqb 0.17, fix devDependencies.

## 1.4.1

### Patch Changes

- 2aa2a48: Fix root subfield lookup when the field was not requested by the client.

## 1.4.0

### Minor Changes

- 49ea582: Support resolving non-root GraphQL fields (#27).

### Patch Changes

- b10f1d2: Make GraphResolveOptions a <Context> generic.

## 1.3.1

### Patch Changes

- 0dc6aa8: Allow pqb 0.16 in peer deps.

## 1.3.0

### Minor Changes

- 0dc1798: Use pqb 0.14 with new raw SQL and afterQuery hook.

## 1.2.0

### Minor Changes

- f90441e: Update orchid-orm, pqb and use the new Orchid `transform` method for pagination in `orchid-graphql`.

## 1.1.1

### Patch Changes

- 19c8c39: Allow pqb 0.12 in peer deps.

## 1.1.0

### Minor Changes

- 030b302: Define graph resolver context type and pass it to callbacks.

## 1.0.0

### Major Changes

- 463ebee: Merge objection-graphql-resolver and orchid-orm, extract common core to graphql-orm.
