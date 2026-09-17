import { getPrisma } from "../src/prisma.js";
import bcrypt from "bcrypt";

async function main() {
  const prisma = getPrisma();

  // Categories
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {
        isActive: true,
      },
      create: {
        name,
        isActive: true,
      },
    });
  }


  // Lab 3 Users
  const defaultPassword = "Password123!";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const users = [
    {
      name: "Alice Johnson",
      email: "alice.johnson@toktickit.test",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Brian Smith",
      email: "brian.smith@toktickit.test",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Chloe Lee",
      email: "chloe.lee@toktickit.test",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Daniel Wong",
      email: "daniel.wong@toktickit.test",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "IT Staff User",
      email: "staff@toktickit.test",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Administrator User",
      email: "admin@toktickit.test",
      role: "ADMINISTRATOR",
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Inactive User",
      email: "inactive@toktickit.test",
      role: "REQUESTER",
      isActive: false,
      mustChangePassword: true,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: {
        email: user.email,
      },
      update: {
        name: user.name,
        role: user.role as any,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
      },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role as any,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
      },
    });
  }


  // Related Systems
  const relatedSystems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {
        isActive: true,
      },
      create: {
        name,
        isActive: true,
      },
    });
  }


  console.log("Category seed completed.");
  console.log("User seed completed.");
  console.log("Related System seed completed.");
}


main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });