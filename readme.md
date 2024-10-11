# Build and run

### Install postgres
Set database url in .env
```
DATABASE_URL="postgresql://user1@localhost/db1?host=/var/run/postgresql/&schema=public"
SESSION_SECRET="not-random-dev-secret" # should be random string for production
```

### Build and run
```
npm install --global yarn
yarn install
yarn prisma generate
yarn run dev
```



