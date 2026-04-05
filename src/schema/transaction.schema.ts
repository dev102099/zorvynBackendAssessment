import { z } from "zod";

export const createTransactionSchema = z.object({
  body: z.object({
    amount: z.number().positive("Amount must be greater than 0"),
    type: z.enum(
      ["INCOME", "EXPENSE"],
      "Type must be either INCOME or EXPENSE",
    ),
    category: z.string().min(1, "Category is required"),
    date: z.string().datetime({
      message: "Invalid date format. Use ISO 8601 (e.g., YYYY-MM-DDTHH:mm:ssZ)",
    }),
    notes: z.string().optional(),
  }),
});

export const updateTransactionSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid transaction ID format"),
  }),
  body: z
    .object({
      amount: z.number().positive().optional(),
      type: z.enum(["INCOME", "EXPENSE"]).optional(),
      category: z.string().min(1).optional(),
      date: z.string().datetime().optional(),
      notes: z.string().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
});

export const filterTransactionSchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    category: z.string().optional(),
    type: z.enum(["INCOME", "EXPENSE"]).optional(),

    // 👇 NEW: Add pagination parameters with safe defaults
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    search: z.string().optional(), // Max 100 per request
  }),
});
export const summarySchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});
