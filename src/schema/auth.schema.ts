import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address format."),
    password: z.string().min(6, "Password must be at least 6 characters long."),
    role: z.enum(["Admin", "Analyst", "Viewer"]).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address format."),
    password: z.string().min(1, "Password is required."),
  }),
});
