# Build and run

## Technology Stack

The software tools and technologies used to build the DTS web application. This includes programming languages, frameworks, libraries, patterns, servers, UI/UX solutions, software, and tools used by developers.

* TypeScript
* Node (version 22)
* React
* Remix
* Drizzle ORM
* PostgreSQL (version 16 with PostGIS add-on)

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
* [Figma Design System] https://www.figma.com/design/noegprarmNGSsk4BQlMVtY/DLDTS-Design-System-and-Screens?node-id=1569-5938&node-type=canvas&t=13qOkaBV7VQnRkzY-0

## Running locally

### Manual

#### Install PostgreSQL

#### Configure application

Copy example.env to .env and adjust the options.

#### Build and run
```
npm install --global yarn
yarn install
yarn run drizzle-kit push
yarn run dev
```

#### Run tests
```
yarn run dotenv -e .env.test drizzle-kit push
yarn run test
```

## Admin Setup

* Setup the admin account: http://localhost:3000/setup/admin-account-welcome
* Import HIPs taxonomy: http://localhost:3000/setup/import-hip

