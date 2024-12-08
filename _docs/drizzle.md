# 2024-12-08

Have to use 2 letter relationship names. Otherwise running into this bug, with 7 level deep nested with queries.

https://github.com/drizzle-team/drizzle-orm/issues/2066

```
export const eventRel = relations(eventTable, ({one, many}) => ({
	ps: many(eventRelationshipTable, {relationName: "child"}),
	cs: many(eventRelationshipTable, {relationName: "parent"})
}));
```
