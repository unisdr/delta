## Comparing database access and ORM libraries for typescript

2024-10-29

# Requirements
- Flexible query syntax that is not that far from regular sql
- Either support for transactions or SQLite in memory mode that can be used for fast tests
- Relatively popular and stable project that is older than a few years
- Avoid unnecessary complexity
- (Optional) Automatic typescript type validation for query results

# Best options

## Use DB driver directly (best option)
Why ORM library or similar would be better than this?
- No validation/autocomplete of column names when writing queries
- No validation of result types
- No portability between different databases (We are likely set with PostgreSQL, less important in this case)

But if there are no great ORM libraries, this could be a better option.

- https://github.com/brianc/node-postgres
- Created in 2010.
- One main developer.

- https://github.com/porsager/postgres
- Safe query generation using tagged template functions.
- Created in 2019.
- One main developer.

## Drizzle (good alternative)
- https://orm.drizzle.team/
- https://github.com/drizzle-team/drizzle-orm

### Summary
Matches all requirements other than it's a relatively new project.

### Other features
- Support for automatic createdAt and updatedAt columns
```
createdAt: timestamp("created_at", { precision: 3 }).default(
sql`current_timestamp(3)`,
),
updatedAt: timestamp("updatedAt").$onUpdateFn(() => new Date())
```

### Queries
```
db
  .select()
  .from(posts)
  .leftJoin(comments, eq(posts.id, comments.post_id))
  .where(eq(posts.id, 10))
	
# Partial select
db.select({
  field1: users.id,
  field2: users.name,
})
```

### Transactions
- No manual transactions (not important)
- https://github.com/drizzle-team/drizzle-orm/issues/966

### Project info
- Created in 2022-07
- Two main developers

## PgTyped (good alternative)
- https://pgtyped.dev/
- https://github.com/adelsz/pgtyped

Query validation based on the current schema in the database.

### Queries
```
INSERT INTO book_comments (user_id, body)
VALUES :comments;

SELECT * FROM users
WHERE (:name :: TEXT IS NULL OR name = :name)
  AND (:age_gt :: INTEGER IS NULL OR age > :age_gt)
ORDER BY (CASE WHEN :asc = true THEN :sort_column END) ASC, :sort_column DESC;	
```

- No dynamic queries
May need to add common filters manually to all queries, such as is_deleted = 0. Composition for more complex queries could have issues.

For some complex dynamic queries, using driver directly could be ok.

### Project info
- Created in 2019.
- One main developer

# Alternatives

## Prisma

Instead of making queries to the database directly, it provides a binary in rust that does some query transformation. This is unnecessary complexity and a dealbreaker.

## Transactions

https://www.prisma.io/docs/orm/prisma-client/queries/transactions#interactive-transactions

## Testing issues

### No in-memory sqlite support
https://github.com/prisma/prisma/issues/732
In memory sqlite would be useful for writing tests. It helps isolating tests.

### No flexible transactions
Prima interface for interactive transactions commits automatically at the end of function. This is not flexible enough for using those for tests without commiting.

### Workaround
```
delete records before each test
await prisma.tableName.deleteMany({});
```
Not a great solution.

## Sequelize
https://sequelize.org/
https://github.com/sequelize/sequelize

- Had a different interface than a regular sql. May be a bit more difficult to write complex queries.

## TypeORM
https://typeorm.io/
https://github.com/typeorm/typeorm

- Had a different interface than a regular sql. May be a bit more difficult to write complex queries.
- Unsure if it has typescript support for partial query results.

## Zapados
https://jawj.github.io/zapatos/
https://github.com/jawj/zapatos

- No support for partial query result. Query builders assume all fields by table.
