# Build and run

### Install postgres
Set database url and session secret in .env
```
DATABASE_URL="postgresql://user1@localhost/db1?host=/var/run/postgresql/&schema=public"
SESSION_SECRET="[random text]"
```

### Build and run
```
npm install --global yarn
yarn install
yarn prisma generate
yarn run dev
```

Run database migration scripts
```
yarn prisma db push
```

Install remix-serve
```
yarn add @remix-run/serve
```

### Technology Stack

The software tools and technologies used to build the DTS web application. This includes programming languages, frameworks, libraries, patterns, servers, UI/UX solutions, software, and tools used by developers.

* Node
* React
* Remix
* Prisma
* PostgreSQL