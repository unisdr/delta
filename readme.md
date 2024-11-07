# Build and run
# 
## Technology Stack

The software tools and technologies used to build the DTS web application. This includes programming languages, frameworks, libraries, patterns, servers, UI/UX solutions, software, and tools used by developers.

* TypeScript
* Node
* React
* Remix
* Drizzle ORM
* PostgreSQL

## License
TODO

Contains the following 3rd party code/assets

```
public/icons/undp-icon-set
https://github.com/undp/design-system/tree/master/stories/assets/icons
Licensed under MIT License
```

## Other Resources

* [HTML & CSS Templates] https://rawgit.com/PreventionWeb/templates/dts/dts/dist/template-index.html


## Running locally

### Install PostgreSQL

### Configure application

Rename example.env to .env and adjust the options.

### Build and run
```
npm install --global yarn
yarn install
yarn run drizzle-kit push
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

### Run tests
```
TODO
yarn run dotenv -e .env.test prisma migrate dev
yarn run test
```

