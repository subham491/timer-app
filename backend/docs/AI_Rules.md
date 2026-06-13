# Clokify Frontend AI Rules

## Tech Stack

- React
- Vite
- TypeScript
- Material UI
- Redux Toolkit
- React Query
- React Hook Form
- Zod
- SCSS Modules

---

## Architecture Rules

- Use feature-driven architecture
- Features must remain isolated
- Shared components must be business-agnostic
- Never place feature logic in shared/
- Use barrel exports via index.ts
- Use absolute imports with @ alias
- Do not create deep relative imports

---

## Styling Rules

- Use MUI `sx` for layout/styling
- Use SCSS Modules for advanced visuals only
- Never use inline style={}
- Prefer responsive MUI sx patterns

---

## State Management Rules

- React Query for server state
- Redux only for global app state
- Do not store API lists in Redux
- Use typed Redux hooks

---

## Component Rules

- Components must be strongly typed
- Use functional components only
- Use named interfaces/types
- Avoid prop drilling
- Extract reusable logic into hooks

---

## Folder Rules

Each feature must contain:
- api/
- components/
- hooks/
- pages/
- types/
- validations/
- tests/

---

## Validation Rules

- Use Zod schemas
- Forms must use React Hook Form
- No manual validation logic

---

## API Rules

- Use centralized axios client
- No direct fetch()
- APIs belong inside feature/api/

---

## Testing Rules

- Use Vitest + RTL
- Add tests for hooks and business logic
- Avoid snapshot-only tests

---

## Performance Rules

- Memoize expensive computations
- Avoid unnecessary re-renders
- Use lazy loading for routes

---

## Timer Rules

- Never use incrementing timers
- Timer calculations must use timestamps
- Use Date.now() delta calculation

---

## Code Quality Rules

- Keep components under 250 lines
- Extract reusable hooks
- Prefer composition over duplication
- Avoid magic strings

## Hard Rules

- Never use any types
- Always ask for loading/error/empty states
- Must follow accessibility best practices
- Must support mobile/tablet/desktop
- Avoid tightly coupling component to one feature unless intentional