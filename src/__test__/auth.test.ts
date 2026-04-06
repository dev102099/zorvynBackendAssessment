import request from "supertest";
import app from "../app";
import { prisma } from "../lib/prisma";

// 1. "describe" groups related tests together.
describe("Authentication API", () => {
  // We use this to clean the database so our tests start fresh!
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { email: "jest-test@example.com" },
    });
  });

  // 3. "it" defines a single, specific test case.
  it("should register a new user successfully", async () => {
    // --- ACT (Do the thing) ---
    // We use Supertest to send a fake HTTP request to our Express app
    const response = await request(app).post("/api/auth/register").send({
      email: "jest-test@example.com",
      password: "securepassword123",
      role: "Viewer",
    });

    // --- ASSERT (Check the results) ---
    // We write exactly what we "expect" the API to return
    expect(response.status).toBe(201);
    expect(response.body.status).toBe("success");
    expect(response.body.data.email).toBe("jest-test@example.com");
  });

  it("should fail to register a user with an invalid email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "securepassword123",
      role: "Viewer",
    });

    // We expect Zod to catch this and throw a 400 Bad Request error
    expect(response.status).toBe(400);
    expect(response.body.status).toBe("error");
  });
});
