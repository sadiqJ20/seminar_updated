# Backend (Supabase)

## Prerequisites
- Node.js 18+
- Supabase account and project

## Setup
1. Install deps:
   ```sh
   npm install
   ```
2. Link your Supabase project:
   ```sh
   npx supabase link --project-ref <your-project-ref>
   ```
   - You may be prompted for an access token from the Supabase dashboard.

## Commands
- Start local stack:
  ```sh
  npm run supabase:start
  ```
- Stop local stack:
  ```sh
  npm run supabase:stop
  ```
- Push migrations to the linked project:
  ```sh
  npm run db:push
  ```
- Reset local db (destructive):
  ```sh
  npm run db:reset
  ```

## Notes
- SQL migrations live in `supabase/migrations/`.
- App uses the browser client with URL/key configured in `integrations/supabase/client.ts`.
