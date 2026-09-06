import { getPrisma } from "../src/prisma.js";

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

  // Development Requesters
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
      create: requester,
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
  console.log("Development Requester seed completed.");
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