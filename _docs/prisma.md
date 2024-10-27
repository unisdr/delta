
## Transactions

https://www.prisma.io/docs/orm/prisma-client/queries/transactions#interactive-transactions

# Gotchas
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
