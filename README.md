# LOCKr — Secure Password Manager

LOCKr is a web app that lets you track and generate passwords for any website or app you use. It is built with **Next.js** (App Router), styled with **Tailwind CSS**, and backed by **Supabase** (Auth + Postgres) with **Vercel** as the deployment target.

## How it works

- **Account password** — your normal login to the app (Supabase Auth).
- **Master password** — a separate password that encrypts your vault. Every time you log in or refresh the page, you must enter your master password to unlock and view your saved credentials.
- **Client-side encryption** — passwords are encrypted with AES-256-GCM in the browser before they are ever sent to the server. Only ciphertext is stored in Supabase.
- **Row Level Security** — each user can only read and write their own credentials.

## Features

- Secure signup / login / password reset via Supabase Auth
- Dashboard with searchable, card-based credential list
- Add / edit / delete credential entries (website, username, encrypted password, notes)
- Built-in password generator (length, symbols, numbers, uppercase)
- Master password vault with automatic lock after 5 minutes of inactivity
- Account settings: change password, change master password (re-encrypts all entries), delete account
- Responsive mobile layout with bottom navigation

## Getting started

1. Clone the repository.
2. Install dependencies: `npm install`
3. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
4. Create a `.env.local` file at the project root with:
   - `NEXT_PUBLIC_SUPABASE_URL=<your supabase project url>`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>`
5. Run the dev server: `npm run dev`

## Scripts

| Command            | Description                  |
| ------------------ | ---------------------------- |
| `npm run dev`      | Start the dev server (port 3000) |
| `npm run build`    | Production build             |
| `npm run start`    | Start the production server  |
| `npm run lint`     | Run ESLint                   |
| `npm run typecheck`| Run TypeScript type checking |