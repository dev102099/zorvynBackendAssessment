# Financial Dashboard API

Welcome to the backend submission for the Financial Dashboard API!

This is a REST API built with **Node.js, Express, and TypeScript** designed to power a financial dashboard. Instead of just building basic CRUD routes, this project focuses heavily on enterprise-grade patterns: strict data validation, Role-Based Access Control (RBAC), database query optimization, and security.

## The Tech Stack

- **Core:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (Hosted on Supabase)
- **ORM:** Prisma
- **Validation:** Zod
- **Security:** JWT Authentication, bcrypt, `express-rate-limit`

---

## Deplyoyed base url

https://zorvynbackendassessment.onrender.com

## Getting Started (Local Setup)

A seed script is included that automatically configures roles, creates test users, and generates realistic financial data so you don't have to test with an empty database.

### 1. Environment Variables

create a supabase project for postgres database.
Create a `.env` file in the root directory and add your connection strings:

```env
PORT=3000
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres" (get this from your supabase database)
DIRECT_URL (also from supabase database)
JWT_SECRET="super_secret_jwt_key_here"
```

### 2. Install & Initialize

Run these commands to install packages, push the schema to PostgreSQL, and populate the database with test data.

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
```

(Note: The seed script safely wipes old transactions before inserting new ones, so you can run it multiple times without duplicating data!)

```bash
npm run dev
```

The server will be live at http://localhost:3000.

## How to Test (Authentication)

This API uses Role-Based Access Control. To make testing easy, the seed script automatically creates an Admin account for you:

Email: ceo@example.com

Password: securepassword123

Make a POST request to /api/auth/login with those credentials.

Grab the token from the JSON response.

Attach it to your HTTP headers for all protected routes like this:
Authorization: Bearer <your_token>

## API Endpoints

### Authentication

| Method | Endpoint             | Description                                | Auth Required |
| :----- | :------------------- | :----------------------------------------- | :-----------: |
| `POST` | `/api/auth/register` | Create a new user (Admin, Analyst, Viewer) |      No       |
| `POST` | `/api/auth/login`    | Authenticate and receive a JWT             |      No       |

### Transactions

| Method   | Endpoint                    | Description                                 | Required Permission |
| :------- | :-------------------------- | :------------------------------------------ | :-----------------: |
| `POST`   | `/api/transactions`         | Log a new income or expense                 |   `record:create`   |
| `GET`    | `/api/transactions`         | Get a paginated, searchable list of records |    `record:read`    |
| `PATCH`  | `/api/transactions/:id`     | Update an existing record                   |   `record:update`   |
| `DELETE` | `/api/transactions/:id`     | Delete a record                             |   `record:delete`   |
| `GET`    | `/api/transactions/summary` | Fetch aggregated dashboard metrics          |   `summary:read`    |

## Pro-tip for the GET /transactions endpoint:

It fully supports pagination and fuzzy searching! Try hitting this URL to see it in action:
GET http://localhost:3000/api/transactions?page=1&limit=5&type=EXPENSE&startDate=2024-01-01&endDate=2024-03-31

## Request Payloads (What to send in the body)

When making POST or PATCH requests, ensure your Content-Type header is set to application/json. Here are the expected payloads for each endpoint based on the strict Zod validation rules:

### Register a New User (POST /api/auth/register)

```
{
  "email": "analyst@example.com",
  "password": "strongpassword123",
  "role": "Analyst"
}
```

(Note: Valid roles are typically Admin, Analyst, or Viewer based on the seed data).

### Login (POST /api/auth/login)

```
{
  "email": "ceo@example.com",
  "password": "securepassword123"
}
```

### Create a Transaction (POST /api/transactions)

```
{
  "amount": 4500.50,
  "type": "INCOME",
  "notes" :"" (optional),
  "category": "Consulting Services",
  "date": "2024-05-01T00:00:00.000Z"
}
```

(Note: type must strictly be either "INCOME" or "EXPENSE").

### Update a Transaction (PATCH /api/transactions/:id)

```
{
   // all feilds optional
  "amount": 5000.00,
  "notes": "Updated payment for Q2 API integration (includes late fee)",
  "type": "INCOME",
  "notes" :"" (optional),
  "category": "Consulting Services",
  "date": "2024-05-01T00:00:00.000Z"
}
```

## Architectural Decisions & Highlights

The "Bouncer" Pattern (Middleware): The Controller layer is kept completely clean by pushing validation to the perimeter. A generic Zod middleware catches malformed payloads (like bad emails or missing fields) and blocks the request before it ever wakes up the business logic.

Concurrent Aggregation: For the /summary endpoint, calculating total income, total expenses, and category breakdowns requires multiple database hits. Instead of chaining database queries (which causes a network waterfall), Promise.all() is used to fire 4 complex PostgreSQL groupBy queries concurrently, drastically reducing response times.

Decoupled RBAC: Access control is split into two distinct steps: Identity (verifyToken) and Authorization (requirePermission). This allows for the dynamic creation of new roles in the database without ever having to rewrite the core API logic.

Rate Limiting: To ensure the API is production-ready, express-rate-limit is implemented to protect the server from brute-force login attempts and basic DoS attacks.

## Assumptions & Tradeoffs

To deliver a highly optimized and maintainable API within the assessment timeframe, I made the following strategic decisions:

### Assumptions

1. **Single-Tenant Enterprise Model:** I assumed this dashboard is for a single company's internal use (B2B) rather than a personal finance app for millions of isolated users (B2C). Therefore, the `Viewer` role can see all aggregated company data, rather than being restricted to an empty personal ledger.
2. **In-Memory JWT Validation:** I assumed standard stateless JWTs are sufficient for this scope. In a strict banking environment, I would implement a Redis blocklist to allow for immediate token revocation upon logout.

### Tradeoffs

1. **Concurrent Queries vs. Raw SQL (The `/summary` endpoint):** \* _Tradeoff:_ I chose to use `Promise.all()` to fire four concurrent Prisma queries instead of writing one massive, highly complex Raw SQL CTE (Common Table Expression).
   - _Why:_ While raw SQL might save 2-3 milliseconds, using Prisma's query builder keeps the codebase strictly typed, database-agnostic, and much easier for future developers to maintain.
2. **Hard Deletes vs. Soft Deletes:**
   - _Tradeoff:_ Currently, the `DELETE /transactions/:id` route permanently removes the record from the database.
   - _Why:_ For the scope of this assessment, this keeps the database clean. In a true production financial system, I would implement "Soft Deletes" (adding a `deletedAt` column) to preserve audit trails.
3. **Zod Perimeter Validation vs. Controller Logic:**
   - _Tradeoff:_ I pushed all `req.body` and `req.query` validation into Express middleware rather than handling it inside the controllers.
   - _Why:_ This slightly increases the middleware stack, but it guarantees that the Controller and Service layers only ever process 100% sanitized, strictly typed data, eliminating dozens of potential runtime crashes.

## Automated Testing

This API includes a robust integration testing suite built with **Jest** and **Supertest**. Instead of just testing isolated functions, the tests send actual HTTP requests to the Express router, validating the entire lifecycle (Middleware -> Controller -> Service -> Database).

### Running the Tests

You do not need to configure a separate testing environment. The test suite is designed to run safely against your active development database without destroying your existing seeded data.

Run the entire suite with a single command:

```bash
npm test
```

### Data Safety & Testing Strategy

Because tests share the development database, I implemented two specific strategies to ensure existing data is never corrupted:

Scoped Teardown: The beforeAll setup blocks are programmed to identify and delete only the specific test user (and their associated transactions) generated during the test run.

Delta Testing (The Summary Endpoint): Instead of asserting hardcoded totals (which would fail if the database already contains seeded data), the tests read the baseline database state, inject test transactions, and verify the delta (the change in totals).

### Test Coverage Highlights

Authentication: Verifies successful registration, login, and rejection of bad credentials.

Security (RBAC): Ensures unauthenticated users or users with insufficient roles are blocked with 401 or 403 errors.

Data Validation: Tests the Zod middleware by sending intentionally malformed data.
