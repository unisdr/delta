# Code Organization

## Folder Structure

### Database Access

`app/backend.server/models`
- Contains database queries, including CRUD and validation
- Each new object type requires functions for all operations
- Follow TypeScript strict typing for all database operations

### Remix Routes

`app/routes`

#### UI Routes
- Handles both full URLs and URL segments for nested layouts
- Components should be organized by feature/domain
- Use proper Remix imports (@remix/run) instead of React Router directly
- Ensure proper SSR handling in components

#### API Routes
`app/routes/api+`
- Defined external API endpoints and non-JSON API (files, images)
- Follow RESTful principles
- Include proper TypeScript types for request/response

### Request Handlers

`app/backend.server/handlers`
- Utility functions for building Remix actions and loaders
- Keep business logic separate from route components
- Implement proper error handling and type safety

### Frontend

`app/frontend`
Contains code that runs on both the server and browser. Primarily UI-related with no direct database access.

#### Best Practices
- Use proper Remix imports (@remix/run) for router hooks
- Initialize global configurations (e.g., QueryClient) outside components
- Implement proper SSR handling in components
- Use React hooks effectively (useMemo, useCallback) for performance
- Follow consistent component structure:
  ```typescript
  // Component structure example
  import { useLocation } from "@remix/run/react";
  import { useMemo } from "react";

  export function MyComponent() {
    // 1. Hooks
    const location = useLocation();

    // 2. Derived state using hooks
    const data = useMemo(() => {
      // Memoized calculations
    }, [dependencies]);

    // 3. Event handlers
    const handleEvent = () => {
      // Event handling logic
    };

    // 4. Render with proper null/loading states
    if (!data) return null;

    return (
      // JSX
    );
  }
  ```

#### Key Files
- `form.tsx` - Shared form components
- `dev_example1.tsx` - Example of form and view using field definitions

### Types

`app/types`
- Global types and declarations
- Follow TypeScript best practices:
  - Use strict typing
  - Avoid 'any' type
  - Define proper interfaces/types for all components and functions

### Content Override

`information-pages-override`
- User-placed markdown files
- Content loaded via loadMarkdownContent.tsx
- Follow consistent naming conventions for files

## State Management Best Practices

1. **Component State**
   - Use local state for UI-only concerns
   - Implement proper loading/error states
   - Handle SSR properly

2. **Global State**
   - Initialize global configurations outside components
   - Use React Query for server state management
   - Follow proper caching strategies

3. **Performance Optimization**
   - Memoize expensive calculations with useMemo
   - Optimize re-renders using proper dependency arrays
   - Implement proper code splitting

## Error Handling

1. **Client-Side**
   - Implement proper error boundaries
   - Handle loading and error states
   - Provide meaningful error messages

2. **Server-Side**
   - Implement proper error handling in loaders/actions
   - Return appropriate HTTP status codes
   - Log errors appropriately

## Testing

- Write unit tests for utility functions
- Implement integration tests for critical paths
- Follow testing best practices for React components
