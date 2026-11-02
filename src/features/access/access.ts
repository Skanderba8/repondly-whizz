import { z } from "zod";

export const accessRoleSchema = z.enum(["employee", "manager"]);
export type AccessRole = z.infer<typeof accessRoleSchema>;

export type WorkspaceAccount = {
  userId: string;
  email: string;
  role: AccessRole;
};

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid work email.")),
  password: z.string().min(1, "Enter your password."),
});
