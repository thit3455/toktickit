import crypto from "crypto";
import { getPrisma } from "../prisma.js";
import { comparePassword } from "../utils/password.js";

export async function login(
  email: string,
  password: string
) {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new Error("ACCOUNT_INACTIVE");
  }

  const passwordValid = await comparePassword(
    password,
    user.passwordHash
  );

  if (!passwordValid) {
    throw new Error("INVALID_CREDENTIALS");
  }


  // Create server session
  const sessionId = crypto.randomBytes(32).toString("hex");

  const expiresAt = new Date();

  expiresAt.setHours(
    expiresAt.getHours() + 1
  );


  await prisma.session.create({
    data: {
      sessionId,
      userId: user.id,
      expiresAt,
    },
  });


  return {
    sessionId,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword:
        user.mustChangePassword,
    },
  };
}