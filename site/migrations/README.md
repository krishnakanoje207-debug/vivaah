# Migrations

Ordered, checksummed SQL applied by `scripts/migrate.mjs` and recorded in
`public.schema_migrations`.

```
node scripts/migrate.mjs                  # status. Read-only. The default.
node scripts/migrate.mjs --up             # apply everything pending
node scripts/migrate.mjs --up --dry-run   # print what --up would do
node scripts/migrate.mjs --baseline 0001  # record as applied WITHOUT running
```

Nothing is written unless a flag asks for it.

## Naming

`NNNN_short_name.sql`, zero-padded, applied in filename order. The number before
the first underscore is the version recorded in `schema_migrations`.

## Rules

**Never edit an applied migration.** The runner checksums every file against
what was recorded and reports `CHANGED`, exiting non-zero. A database that has
already run a migration cannot be corrected by rewriting it — that needs a new
migration. This is the one rule that matters; everything else here is
convenience.

**One transaction per migration.** The runner wraps each file in
`begin`/`commit` and rolls back the whole thing on error, because a
half-applied migration is the worst outcome: nothing afterwards can tell how far
it got.

**Owner connection only.** The runner uses `DATABASE_URL`, never
`DATABASE_URL_PUBLIC` — `app_public` is the storefront role and is deliberately
refused DDL and every booking table.

**RLS on every new public table.** `scripts/verify-schema.mjs` asserts it, and
will fail the moment a table is added without it. That gate caught
`schema_migrations` itself on the first run of this script.

## 0001 is baselined, not applied

`0001_initial.sql` is a verbatim copy of `specs/schema.sql`, which was applied
to Neon **by hand** before this directory existed. It is recorded as
`baseline` — the row exists, the SQL was never executed by the runner. Running
it would have failed on every `create table` or, worse, partially succeeded.

Baselining was justified by `scripts/verify-schema.mjs` passing 17/17 against
the live database, which proves the load-bearing parts are genuinely there: the
GiST exclusion constraint behind the double-booking guarantee, the
`booking_items` triggers, and the two-role RLS model.

Only ever baseline a migration you have confirmed is already in the database.

## Adding one

1. Write `NNNN_name.sql`.
2. `node scripts/migrate.mjs --up --dry-run`
3. `node scripts/migrate.mjs --up`
4. `node scripts/verify-schema.mjs` — every new public table needs RLS.

`specs/schema.sql` stays the design document. From 0002 on the two diverge: the
migrations are the history, the spec is the intent.
