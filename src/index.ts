import dotenv from "dotenv";
import app from "./app";
import { PrismaPg } from "@prisma/adapter-pg";
import { prisma } from "./lib/prisma";
import pg from "pg";

dotenv.config();
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ Successfully connected to Supabase PostgreSQL.");

    app.listen(PORT, () => {
      console.log(`🚀 Server is listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to the database:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
