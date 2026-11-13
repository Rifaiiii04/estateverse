# EstateVerse — Project Guidelines

Refer to [.agents/AGENTS.md](file:///.agents/AGENTS.md) for the authoritative rules and guidelines.

## Quick Summary of Standards
- **File Length**: Target 150–200 lines; hard limit 250 lines per source file.
- **Function Length**: Target < 40 lines; maximum 50 lines.
- **Nesting**: Maximum 3 nested control-flow levels.
- **Comments**: Every named function, method, React component, and custom hook must have a concise one-sentence comment immediately above its declaration.
- **Stack**: Go backend (MySQL via Laragon), Next.js App Router (TypeScript, Tailwind CSS, Three.js / React Three Fiber).
- **Security**: HttpOnly cookies, token hashing, server-side authorization and ownership checks, parameterized queries.
