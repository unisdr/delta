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
This software is proprietary and owned by UNDRR. All rights reserved.

The software uses several third-party open-source components under permissive licenses (MIT, Apache 2.0, etc.). These licenses are compatible with proprietary distribution.

For more details, see [LICENSE.md](LICENSE.md).

This instance is built for country-level deployment by UNDRR and is intended for use by the designated country's government agencies.


```
public/icons/undp-icon-set
https://github.com/undp/design-system/tree/master/stories/assets/icons
Licensed under MIT License
```

## Other Resources
* [Developer documentation](_docs/index.md)

* [HTML & CSS Templates] https://rawgit.com/PreventionWeb/templates/dts/dts/dist/template-index.html
* [Figma Design System] https://www.figma.com/design/noegprarmNGSsk4BQlMVtY/DLDTS-Design-System-and-Screens?node-id=1569-5938&node-type=canvas&t=13qOkaBV7VQnRkzY-0
* [DTS Variables] https://unitednations.sharepoint.com/:x:/r/sites/UNDRR-OnaDLASproject/_layouts/15/Doc.aspx?sourcedoc=%7BEC43CA17-E8FF-44E6-9B1C-5DC0B386DF2A%7D&file=DTS%20Variables%20and%20baselines.xlsx&action=default&mobileredirect=true
* [All Sectors Taxonomy and Assets] https://unitednations.sharepoint.com/:x:/r/sites/UNDRR-OnaDLASproject/_layouts/15/Doc.aspx?sourcedoc=%7BD2395365-1B2D-4E11-BAE8-F40D0C6C8838%7D&file=All%20sectors_%20Taxonomies.xlsx&action=default&mobileredirect=true
* [Excel master file to manage sectors] https://unitednations.sharepoint.com/:x:/r/sites/UNDRR-OnaDLASproject/Shared%20Documents/Technology%20Track/Data%20Model/Entities%20DTS%20Database.xlsx?d=w544fc777f3994d2ea18389925503cbd7&csf=1&web=1&e=nE3pWa
* [Excel master file to manage assets] https://unitednations.sharepoint.com/:x:/r/sites/UNDRR-OnaDLASproject/Shared%20Documents/Technology%20Track/Data%20Model/assets.xlsx?d=w9655344ddd85470fb2e2a0e945f8aa31&csf=1&web=1&e=dx2QpX

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

