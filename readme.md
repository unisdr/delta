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
* [DTS Variables] https://unitednations.sharepoint.com/:x:/r/sites/UNDRR-OnaDLASproject/_layouts/15/Doc.aspx?sourcedoc=%7BEC43CA17-E8FF-44E6-9B1C-5DC0B386DF2A%7D&file=DTS%20Variables%20and%20baselines.xlsx&action=default&mobileredirect=true
* [All Sectors Taxonomy and Assets] https://unitednations.sharepoint.com/:x:/r/sites/UNDRR-OnaDLASproject/_layouts/15/Doc.aspx?sourcedoc=%7BD2395365-1B2D-4E11-BAE8-F40D0C6C8838%7D&file=All%20sectors_%20Taxonomies.xlsx&action=default&mobileredirect=true

## API Architecture

### Resource Routes

The application follows Remix's resource route pattern for API endpoints. This provides several benefits:
- Clean URL structure
- Built-in TypeScript support
- Automatic response handling
- Server-side rendering capabilities

Example resource route structure:
```
app/routes/api+/analytics+/
├── geographic-levels.ts             # List all geographic levels
└── geographic-levels.$id.boundary.ts # Get boundary for specific level
```

### API Design Principles

1. **Single Responsibility**
   - Each endpoint serves one specific purpose
   - Data is split into separate endpoints when appropriate
   - Example: Geographic levels list vs. boundary data

2. **Performance Optimization**
   - Heavy data (like GeoJSON) loaded only when needed
   - Responses include only necessary fields
   - Separate endpoints for different data needs

3. **RESTful Design**
   - Clear, hierarchical URL structure
   - Proper use of HTTP methods
   - Consistent response formats

4. **Type Safety**
   - Full TypeScript support
   - Drizzle ORM for type-safe database queries
   - Consistent error handling

### Example Implementation

Geographic Levels API demonstrates these principles:

1. `/api/analytics/geographic-levels`
   - Lists available geographic levels
   - Used by filter dropdowns
   - Returns minimal data: id, name, level

2. `/api/analytics/geographic-levels/:id/boundary`
   - Returns GeoJSON boundary data
   - Used by map visualization
   - Loaded only when a specific level is selected

This separation ensures:
- Efficient data loading
- Clear separation of concerns
- Optimal performance
- Maintainable codebase

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
