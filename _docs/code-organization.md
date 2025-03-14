# Code Organization

## Important concepts
- [form csv api](form-csv-api)

## Folder Structure

## Server only code
`app/backend.server`

### Database Access
`app/backend.server/models`
- [models](models)

### Request Handlers
`app/backend.server/handlers`
- [handlers](handlers)

### Remix Routes
- [routes](routes)
`app/routes`

### Frontend
- [frontend](frontend)
`app/frontend`

### Database schema
- [drizzle](drizzle)
`app/drizzle`

### Types
`app/types`
- Global types and declarations for dependencies not in ts (or without builtin type definitions)

### Content Override
`information-pages-override`
- User-placed markdown files
- Content loaded via loadMarkdownContent.tsx
- Follow consistent naming conventions for files

