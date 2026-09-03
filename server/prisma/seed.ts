import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();

  // ---------------------------------------------------------
  // Lab 1 + Lab 2: Seed Ticket Categories
  // Must be safe to run repeatedly without duplicates.
  // ---------------------------------------------------------
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ---------------------------------------------------------
  // Lab 2: Seed Development Requesters
  // At least 4 active and 1 inactive Requester.
  // ---------------------------------------------------------
  const requesters = [
    {
      name: "Alice Johnson",
      email: "alice.johnson@toktickit.test",
      isActive: true,
    },
    {
      name: "Brian Smith",
      email: "brian.smith@toktickit.test",
      isActive: true,
    },
    {
      name: "Chloe Lee",
      email: "chloe.lee@toktickit.test",
      isActive: true,
    },
    {
      name: "Daniel Wong",
      email: "daniel.wong@toktickit.test",
      isActive: true,
    },
    {
      name: "Inactive Requester",
      email: "inactive.requester@toktickit.test",
      isActive: false,
    },
  ];

  for (const requester of requesters) {
    await prisma.requesterUser.upsert({
      where: {
        email: requester.email,
      },
      update: {
        name: requester.name,
        isActive: requester.isActive,
      },
      create: {
        name: requester.name,
        email: requester.email,
        isActive: requester.isActive,
      },
    });
  }

  console.log("Category seed completed.");
  console.log("Development Requester seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });