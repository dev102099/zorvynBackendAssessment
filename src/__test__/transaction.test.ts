// src/__tests__/transaction.test.ts

import request from "supertest";
import app from "../app";
import { prisma } from "../lib/prisma";

describe("Transaction API", () => {
  let authToken: string;
  let testUserId: string;

  // --- SETUP PHASE ---
  beforeAll(async () => {
    // 1. Find the test user if they were left over from a previous test run
    const existingUser = await prisma.user.findUnique({
      where: { email: "admin-test@example.com" },
    });

    // 2. Safely delete ONLY this specific user's transactions, then delete the user
    if (existingUser) {
      await prisma.transaction.deleteMany({
        where: { userId: existingUser.id },
      });
      await prisma.user.delete({
        where: { id: existingUser.id },
      });
    }

    // 3. Register the fresh Admin test user
    await request(app).post("/api/auth/register").send({
      email: "admin-test@example.com",
      password: "securepassword123",
      role: "Admin",
    });

    // 4. ACTUALLY log them in to get the JWT!
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "admin-test@example.com",
      password: "securepassword123",
    });

    // 5. Save the token for our tests to use!
    authToken = loginRes.body.data.token;
  });

  // --- THE TESTS ---

  it("should block unauthenticated users from creating a transaction", async () => {
    const response = await request(app).post("/api/transactions").send({
      amount: 1000,
      type: "INCOME",
      category: "Salary",
      date: "2024-03-01T10:00:00Z",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Access denied. No token provided.");
  });

  it("should allow an Admin to successfully create an INCOME transaction", async () => {
    const response = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        amount: 5000,
        type: "INCOME",
        category: "Salary",
        date: "2024-03-01T10:00:00Z",
        notes: "Test Salary",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.amount).toBe(5000);
    expect(response.body.data.type).toBe("INCOME");
  });

  it("should return a properly calculated summary dashboard (Delta Test)", async () => {
    // 1. Get the BASELINE before we add any test transactions
    const initialSummaryRes = await request(app)
      .get("/api/transactions/summary")
      .set("Authorization", `Bearer ${authToken}`);

    // Store the starting numbers (default to 0 if the DB happens to be empty)
    const baselineIncome =
      initialSummaryRes.body.data.overview.totalIncome || 0;
    const baselineExpenses =
      initialSummaryRes.body.data.overview.totalExpenses || 0;
    const baselineNet = initialSummaryRes.body.data.overview.netBalance || 0;

    // 2. Add our test INCOME (+5000)
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        amount: 5000,
        type: "INCOME",
        category: "Freelance",
        date: "2024-03-01T10:00:00Z",
      });

    // 3. Add our test EXPENSE (+1000)
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        amount: 1000,
        type: "EXPENSE",
        category: "Software",
        date: "2024-03-05T10:00:00Z",
      });

    // 4. Fetch the NEW summary
    const finalSummaryRes = await request(app)
      .get("/api/transactions/summary")
      .set("Authorization", `Bearer ${authToken}`);

    expect(finalSummaryRes.status).toBe(200);

    // 5. Assert the DELTA (New Value = Old Value + Our Test Data)
    expect(finalSummaryRes.body.data.overview.totalIncome).toBe(
      baselineIncome + 5000,
    );
    expect(finalSummaryRes.body.data.overview.totalExpenses).toBe(
      baselineExpenses + 1000,
    );
    expect(finalSummaryRes.body.data.overview.netBalance).toBe(
      baselineNet + 4000,
    ); // 5000 - 1000 = 4000 net change
  });
});
