# 2024-12-08

Have to use 2 letter relationship names. Otherwise running into this bug, with 7 level deep nested with queries.

https://github.com/drizzle-team/drizzle-orm/issues/2066

```
export const eventRel = relations(eventTable, ({one, many}) => ({
	ps: many(eventRelationshipTable, {relationName: "child"}),
	cs: many(eventRelationshipTable, {relationName: "parent"})
}));
```

# 2025-01-30
Drizzle custom migration using sql commands.
https://orm.drizzle.team/docs/drizzle-config-file


Currently, running custom JavaScript and TypeScript migration/seeding scripts is not supported yet in drizzle and will be added in the upcoming release, you can follow github discussion.
https://github.com/drizzle-team/drizzle-orm/discussions/2832



To migrate database in drizzle:

First, make sure you have migrations property in drizzle.config.ts:
```
	migrations: {
		prefix: "timestamp",
		table: "__drizzle_migrations__",
		schema: "public",
	  },
```
Then follow steps below:


1. Step one: generate sql custom file with --name, replace 
change_audit_logs.user_id_to_integer with your own chosen name

```
yarn drizzle-kit generate --custom --name=change_audit_logs.user_id_to_integer
```

2. Step two: add your custom sql in change 
```
change_audit_logs.user_id_to_integer.sql
```

3. Step three: migrate your db

```
yarn drizzle-kit migrate 
```