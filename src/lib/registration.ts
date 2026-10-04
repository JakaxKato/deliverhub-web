import { z } from "zod";

export const registrationDepartments = ["UIUX", "FRONTEND", "BACKEND"] as const;

export const registrationSchema = z.object({
  name: z.string().trim().min(1, "Full name is required."),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
  department: z.enum(registrationDepartments),
});
export type RegistrationForm = z.infer<typeof registrationSchema>;

export function buildRegistrationPayload(input: unknown) {
  return { ...registrationSchema.parse(input), role: "MEMBER" as const };
}
