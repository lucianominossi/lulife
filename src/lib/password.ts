import { z } from "zod";

/** Shared password rules for register / reset / profile. */
export const passwordSchema = z
  .string()
  .min(10, "A senha deve ter pelo menos 10 caracteres.")
  .max(100)
  .regex(/[A-Za-z]/, "A senha deve incluir pelo menos uma letra.")
  .regex(/[0-9]/, "A senha deve incluir pelo menos um número.");

export const PASSWORD_HINT =
  "Mínimo 10 caracteres, com letra e número.";
