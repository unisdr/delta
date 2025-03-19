# Code Organization

## Important concepts
- [Form CSV API](form-csv-api.md)

## Folder Structure

## Server only code
`app/backend.server`

### Database Access
`app/backend.server/models`
- [Models](models.md)

### Request Handlers
`app/backend.server/handlers`
- [Handlers](handlers.md)

### Remix Routes
- [Routes](routes.md)
`app/routes`

### Frontend
- [Frontend](frontend.md)
`app/frontend`

### Database schema
- [Drizzle](drizzle.md)
`app/drizzle`

### Types
`app/types`
- Global types and declarations for dependencies not in ts (or without builtin type definitions)

### Content Override
`information-pages-override`
- User-placed markdown files
- Content loaded via loadMarkdownContent.tsx
- Follow consistent naming conventions for files

