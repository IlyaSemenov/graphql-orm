# orchid-graphql

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
