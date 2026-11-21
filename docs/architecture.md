# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Use React route components with the shared API client. Each capability must expose loading, meaningful empty, and accessible error states.
- Logic tier decision: Keep validation and orchestration in Express route/service code, returning deliberate 4xx responses for invalid input and missing resources.
- Data tier decision: Use Mongoose models with required fields, sensible defaults, and references between users, teams, and activities. Keep seed data idempotent and preserve unrelated records.
- Activity tracking approach: Validate IDs and referenced user/team documents before creating an activity; compute points and `occurredAt` on creation, then expose list and create endpoints.
- Team management approach: Validate the team name, preserve the submitted name and mascot, default members to an empty array, and expose list and create endpoints.
- Leaderboard approach: Aggregate activity points by team, join team names, sort descending by total points, and assign 1-based ranks.
- Workout suggestions approach: Find the user by email, use the user's goal and recent activity to select matching workouts, include an explanatory reason, and return a deliberate 4xx for unknown users.

## Test plan

Record the commands you run and what each failure means. Implement in dependency order: data models and seed behavior, API routes, then presentation routes and states.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
- Current result: 4 of 5 tests fail because required model validation is incomplete; the seed/idempotency test passes.
- API command: `npm run test:api --prefix octofit-tracker/backend`
- Current result: 4 of 4 tests fail: invalid requests return `501`, the leaderboard is empty, and workout suggestions lack the required reason.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
- Current result: 15 of 15 tests fail because capability data rendering, user-specific workout requests, loading states, empty states, and accessible error states are incomplete.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
- Current result: passes.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
- Current result: passes.
