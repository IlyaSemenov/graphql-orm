# graphql-orm Agent Guide

## Overview

This monorepo contains helper libraries for resolving GraphQL queries through Objection.js and Orchid ORM.

Read [README.md](README.md) completely before changing a public API, package behavior, supported runtime, or user documentation.

Extend this guide only with stable, non-obvious conventions, architecture, contracts, workflows, and gotchas.
Do not catalog files or restate information evident from their names and locations.

## Scope

- Keep shared ORM-independent logic in `packages/base`.
- Keep ORM-specific integrations in their respective `packages/objection` and `packages/orchid` packages.
- Keep production code inside each package's `src/` directory.
- Keep each package's `src/index.ts` limited to explicit public exports.
- Treat public package exports, supported Node.js versions, and ESM/CommonJS availability as public contracts.

## Documentation

- Write public README and JSDoc text for package users who do not know the implementation.
- Do not document obvious or implied defaults.
- Describe a default only when readers need it to make a decision or avoid surprising behavior.
- Use One Sentence Per Line for connected prose.
- Keep semantically connected explanations as prose paragraphs.
- Use lists for separate assertions instead of presenting them as prose paragraphs.

## Changesets

- Add one `.changeset/*.md` file for each independently releasable user-visible change to `objection-graphql-resolver` or `orchid-graphql`.
- Include every affected public package in the changeset frontmatter.
- Do not add changesets for internal refactors, maintenance, tests, or documentation changes that do not require a package release.
- Choose the SemVer bump from the public contract: `patch` for backward-compatible fixes, `minor` for backward-compatible functionality, and `major` for breaking changes.
- Write one or two sentences for package users that describe the observable change or new capability without implementation details or rationale.
- Do not edit package versions or `CHANGELOG.md` files by hand, and do not run `changeset version` or `changeset publish`; the release workflow consumes pending changesets.

## Checks

- Run the affected package's test script when behavior changes.
- Run the affected package's build script when package exports, declarations, or supported runtimes change.
- Run the Orchid package's type tests when its inferred public types change.
