# 📊 Financial Dashboard API

Welcome to the backend submission for the Financial Dashboard API!

This is a REST API built with **Node.js, Express, and TypeScript** designed to power a financial dashboard. Instead of just building basic CRUD routes, this project focuses heavily on enterprise-grade patterns: strict data validation, Role-Based Access Control (RBAC), database query optimization, and security.

## 🛠 The Tech Stack

- **Core:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (Hosted on Supabase)
- **ORM:** Prisma
- **Validation:** Zod
- **Security:** JWT Authentication, bcrypt, `express-rate-limit`

---

## 🚀 Getting Started (Local Setup)

A seed script is included that automatically configures roles, creates test users, and generates realistic financial data so you don't have to test with an empty database.

### 1. Environment Variables

Create a `.env` file in the root directory and add your connection strings:

```env
PORT=3000
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"
JWT_SECRET="super_secret_jwt_key_here"
```

### 2. Install & Initialize

Run these commands to install packages, push the schema to PostgreSQL, and populate the database with test data.

```bash
npm install
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
GET /api/transactions?page=1&limit=5&search=salary&type=INCOME

## Architectural Decisions & Highlights

The "Bouncer" Pattern (Middleware): The Controller layer is kept completely clean by pushing validation to the perimeter. A generic Zod middleware catches malformed payloads (like bad emails or missing fields) and blocks the request before it ever wakes up the business logic.

Concurrent Aggregation: For the /summary endpoint, calculating total income, total expenses, and category breakdowns requires multiple database hits. Instead of chaining database queries (which causes a network waterfall), Promise.all() is used to fire 4 complex PostgreSQL groupBy queries concurrently, drastically reducing response times.

Decoupled RBAC: Access control is split into two distinct steps: Identity (verifyToken) and Authorization (requirePermission). This allows for the dynamic creation of new roles in the database without ever having to rewrite the core API logic.

Rate Limiting: To ensure the API is production-ready, express-rate-limit is implemented to protect the server from brute-force login attempts and basic DoS attacks.
