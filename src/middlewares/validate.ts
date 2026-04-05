import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";

export const validate = (schema: ZodObject) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Zod checks the req.body against the schema
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // If it passes, move on to the Controller!
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors nicely for the frontend
        const errorMessages = error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors: errorMessages,
        });
        return;
      }
      next(error);
    }
  };
};
