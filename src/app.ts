import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import transactionRoutes from "./routes/transaction.routes";
import rateLimit from "express-rate-limit";

const app: Application = express();

app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: {
    status: "error",
    message:
      "Too many requests from this IP, please try again after 15 minutes.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Finance API is running efficiently.",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[Error]:", err.message || err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
});

export default app;
