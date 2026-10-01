import request from "supertest";
import bcrypt from "bcrypt";
import { User } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

export async function requesterFixture() {
  const prisma = getPrisma();
  const stamp = randomUUID();
  const password = "RequesterTest123!";
  const passwordHash = await bcrypt.hash(password, 4);
  const users: User[] = [];
  const agents = [];
  for (const role of ["REQUESTER", "REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const) {
    const email = `${stamp}-${users.length}@example.test`;
    const user = await prisma.user.create({ data: { email, name: `Fixture ${role}`, role, passwordHash, mustChangePassword: false } });
    users.push(user);
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({ email, password });
    if (login.status !== 200) throw new Error("Fixture login failed");
    agents.push(agent);
  }
  return { users, agents, password, async cleanup() {
    const ids = users.map(user => user.id);
    await prisma.ticket.deleteMany({ where: { requesterId: { in: ids } } });
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  } };
}
