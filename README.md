# Coding Leaderboard

A MERN stack website that ranks users by total solved questions across coding platforms. The backend refreshes platform stats on an interval, recalculates ranks, and pushes updates to the React UI with Socket.IO.

## Features

- Live leaderboard sorted by total solved questions
- Add users with LeetCode, CodeChef, HackerRank, Codeforces, or other platform handles
- Platform adapters for LeetCode GraphQL, CodeChef profile pages, and Codeforces public API
- HackerRank and `other` are marked for manual updates because they do not provide a stable public solved-count API
- MongoDB persistence with Express routes
- Socket.IO real-time updates

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and set `MONGO_URI`.

3. Run MongoDB locally or point `MONGO_URI` to MongoDB Atlas.

4. Start the app:

   ```bash
   npm run dev
   ```

The React app runs at `http://localhost:5173` and the API runs at `http://localhost:5000`.

## API

- `GET /api/leaderboard` returns ranked users
- `POST /api/users` adds a user
- `PATCH /api/users/:id` updates a user
- `POST /api/users/:id/refresh` refreshes one user immediately

## Notes

## Deploy

For a single-service MERN deployment such as Render:

- Build command: `npm run render-build`
- Start command: `npm start`
- Environment variables:
  - `NODE_ENV=production`
  - `MONGO_URI=<your MongoDB Atlas connection string>`
  - `CLIENT_ORIGIN=<your deployed app URL>`
  - `REFRESH_INTERVAL_MS=180000`
  - `SEED_DEMO_DATA=false`

In production, Express serves the built React app from `dist/`, so `VITE_API_URL` is not required unless you split frontend and backend onto different domains.

## Notes

Some coding sites restrict scraping or do not expose solved-count APIs. For production, add official OAuth/API integrations where available, cache aggressively, and respect each platform's terms.
