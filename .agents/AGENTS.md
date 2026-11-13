# EstateVerse — Agent Instructions

## 1. Project Overview

EstateVerse is a property presentation platform with interactive 3D house visualization.

### MVP Scope
- Go backend.
- MySQL database via Laragon.
- Next.js + TypeScript frontend.
- Seller authentication and authorization.
- Property information management.
- Explore House as the default 3D view.
- Walk Inside for interior navigation.
- Explore Estate is optional and out of scope for the initial MVP.

Do not implement features outside the agreed MVP without approval.

## 2. Code Quality Standards

Write clean, readable, maintainable, and modular code.

- Follow the Single Responsibility Principle.
- Keep functions, components, and modules focused.
- Avoid spaghetti code, god objects, god functions, and duplicated logic.
- Avoid deeply nested conditionals and unnecessary branching.
- Prefer early returns when they improve readability.
- Use descriptive and consistent naming.
- Avoid unexplained magic numbers and hardcoded configuration.
- Do not introduce abstractions or dependencies without a clear reason.
- Do not compress code merely to reduce line count.
- Do not sacrifice readability for fewer files or fewer lines.
- Follow the established conventions of the existing project.

## 3. File and Function Size Limits

### Maximum File Length
- Target 150–200 lines per source file.
- Hard limit: 250 lines per source file.
- Count physical lines, including comments and blank lines.
- Apply this rule to Go, TypeScript, TSX, and other handwritten source files.
- If a file approaches the limit, review its responsibilities before adding more code.
- If a file exceeds the limit, refactor it into cohesive modules before considering the task complete.

### Exceptions
The limit may be exceeded only when splitting would make the code less maintainable, such as:
- Generated source files.
- Generated database code.
- Large test fixtures or static data.
- Database migration files that should remain atomic.

Do not use exceptions to justify oversized application logic.

### Function and Component Length
- Aim for functions and methods under 40 lines.
- If a function exceeds 50 lines, consider refactoring it.
- Extract cohesive logic into well-named helper functions.
- Keep React components focused on rendering and UI composition.
- Separate business logic, API calls, and complex state transitions when appropriate.
- Avoid creating tiny functions that only add indirection without improving clarity.

### Nesting
- Aim for a maximum of 3 nested control-flow levels.
- Refactor complex branches into smaller functions when doing so improves readability.
- Avoid deeply nested callbacks and conditional expressions.

## 4. Function and Component Comments

Every named function, method, React component, and custom hook must have a short comment immediately above its declaration.

For functions assigned to constants, place the comment above the declaration.

Comments must:
- Explain the function's purpose.
- Be concise, preferably one sentence.
- Use the same language as the surrounding codebase.
- Describe intent instead of repeating the function name.
- Be updated when the function's behavior changes.

Examples:

Go:

// CreateProperty validates and saves a property listing.
func CreateProperty(...) error {
    // Implementation
}

TypeScript:

// Fetches the currently authenticated seller.
async function getCurrentSeller() {
    // Implementation
}

React:

// Renders the interactive 3D house viewer.
function HouseViewer() {
    // Implementation
}

Custom hook:

// Manages the active camera mode of the house viewer.
function useHouseViewer() {
    // Implementation
}

For functions assigned to constants:

// Sends authenticated requests to the Go API.
const apiClient = createApiClient();

Avoid long explanations above functions. Put detailed reasoning in documentation only when necessary.

Do not add comments to every statement or trivial expression.
Extract complex inline callbacks into named functions when that improves readability.
Trivial inline callbacks do not require separate comments.

## 5. Architecture and Separation of Concerns

### Backend — Go
- Keep main.go focused on application startup and dependency initialization.
- Separate HTTP handlers, business logic, database access, and configuration when appropriate.
- Use database/sql and the MySQL driver.
- Pass request contexts to database operations.
- Validate incoming requests on the server.
- Return consistent JSON responses and HTTP status codes.
- Handle errors explicitly.
- Use parameterized SQL queries.
- Avoid unnecessary global mutable state.

### Database — MySQL
- Maintain explicit foreign-key relationships.
- Add indexes based on query requirements.
- Keep database schema changes in migration files.
- Use transactions for operations that require atomicity.
- Never build SQL queries by concatenating user input.
- Enforce property ownership on every protected operation.

### Frontend — Next.js
- Use TypeScript with strict typing.
- Use the existing Next.js routing conventions.
- Keep components small and focused.
- Separate reusable UI components from feature-specific components.
- Separate API communication from presentation where appropriate.
- Handle loading, error, empty, and success states.
- Do not connect directly to MySQL.
- Do not put complex business logic into large page components.
- Avoid unnecessary client-side rendering when server rendering is sufficient.

### 3D Viewer
- Use Three.js / React Three Fiber.
- Prefer optimized GLB/glTF assets.
- Keep camera controls and view-mode transitions modular.
- Explore House is the default mode.
- Walk Inside supports interior navigation.
- Explore Estate remains optional.
- Consider loading performance on mobile devices.
- Do not assume model geometry can be hidden or navigated
  correctly without inspecting its structure.

## 6. Security

- Never hardcode credentials, API keys, or secrets.
- Store local secrets in environment variables.
- Never commit .env files.
- Hash passwords using an appropriate password-hashing algorithm.
- Never store raw authentication tokens in the database.
- Do not store authentication tokens in localStorage.
- Use secure session cookies with appropriate production settings.
- Validate authorization on the backend.
- Never trust user IDs or roles supplied by the frontend.
- Do not expose internal errors, credentials, or sensitive data.
- Validate uploaded file types, sizes, and storage paths.

## 7. Development Workflow

Before making changes:
1. Inspect relevant existing files.
2. Understand the current architecture and conventions.
3. Identify the smallest maintainable solution.
4. Avoid rewriting unrelated code.

After making changes:
1. Run the relevant formatter.
2. Run tests and static checks where available.
3. Check file and function size limits.
4. Review comments for clarity and accuracy.
5. Verify that existing behavior has not been unintentionally broken.
6. Report files changed, checks performed, and known limitations.

Do not claim tests passed unless they were actually executed.

## 8. Change Management

- Make focused changes.
- Do not rewrite entire files when a smaller change is sufficient.
- Do not add features beyond the requested scope.
- Do not silently change API contracts or database schemas.
- Explain important architectural changes before implementing them.
- If a requirement is ambiguous, state the assumption being used.
- Prefer incremental refactoring over large, risky rewrites.

## 9. Definition of Done

A change is complete only when:
- The implementation follows the established architecture.
- Functions and components have appropriate comments.
- Source files meet the line-count guidelines.
- There is no unnecessary duplication or excessive nesting.
- Error handling and validation are implemented where needed.
- Relevant tests and checks have been run.
- Any remaining limitations are clearly reported.