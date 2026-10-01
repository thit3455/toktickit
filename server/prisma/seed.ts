import { getPrisma } from "../src/prisma.js";
import bcrypt from "bcrypt";
import { RequestedPriority, TicketPriority, TicketStatus } from "@prisma/client";

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
      update: {}, // Preserve existing development data when reseeding.
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
      name: "Khin Myat",
      email: "khin.myat@toktickit.test",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Brian Smith",
      email: "brian.smith@toktickit.test",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Chloe Lee",
      email: "chloe.lee@toktickit.test",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Yamazar Ki",
      email: "yamazar.ki@toktickit.test",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Zig",
      email: "zig@toktickit.test",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Hazel",
      email: "staff@toktickit.test",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: true,
    },
    {
  name: "Michael Brown",
  email: "michael.brown@toktickit.test",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: true,
},

{
  name: "Sarah Wilson",
  email: "sarah.wilson@toktickit.test",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: true,
},

{
  name: "David Lee",
  email: "david.lee@toktickit.test",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: true,
},

{
  name: "Inactive IT Staff",
  email: "inactive.staff@toktickit.test",
  role: "IT_STAFF",
  isActive: false,
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

      update: {}, // Never reset existing passwords, roles or account settings.

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

      update: {},

      create: {
        name,
        isActive: true,
      },
    });
  }


  // Fixed seed identity: reruns must not duplicate or reset a claimed/updated ticket.
  const requester = await prisma.user.findFirstOrThrow({
    where: { email: "brian.smith@toktickit.test", role: "REQUESTER", isActive: true },
  });
  const category = await prisma.category.findFirstOrThrow({
    where: { name: "Network", isActive: true },
  });
  const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
    where: { name: "Campus Wi-Fi", isActive: true },
  });
  const ticket = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-LAB3-UNASSIGNED-001" },
    update: {},
    create: {
      ticketNumber: "TKT-LAB3-UNASSIGNED-001",
      requesterId: requester.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      assignedStaffId: null,
      summary: "Laptop repeatedly disconnects from Campus Wi-Fi in the library",
      description: "My laptop connects to Campus Wi-Fi in the library but disconnects every few minutes. I have restarted the laptop and forgotten and rejoined the network. Other websites work briefly after reconnecting, but online classes keep dropping. Please investigate the wireless connection.",
      requestedPriority: "HIGH",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
    },
  });
  console.log(`Lab 3 ticket seed completed: ${ticket.ticketNumber}`);

  // Stable identities and empty updates preserve tickets after staff work on them.
  const queueExamples: {
    summary: string; description: string; category: string; system: string;
    requestedPriority: RequestedPriority; itPriority: TicketPriority; status: TicketStatus;
    assigned: boolean;
  }[] = [
    { summary: "Library printer produces faded lecture handouts", description: "The shared library printer produces faded pages even after replacing paper. Please check toner and print quality before tomorrow's classes.", category: "Hardware", system: "Printer", requestedPriority: "MEDIUM", itPriority: "MEDIUM", status: "NEW", assigned: false },
    { summary: "VPN disconnects while accessing research files", description: "The VPN drops after five minutes when accessing research files from home. Support is reviewing the client logs and gateway timeout settings.", category: "Network", system: "VPN", requestedPriority: "HIGH", itPriority: "HIGH", status: "IN_PROGRESS", assigned: true },
    { summary: "LEB2 assignment upload remains at zero percent", description: "A PDF assignment cannot be uploaded despite trying a second browser. The deadline is tonight and the course team has confirmed the submission portal is open.", category: "Software", system: "LEB2 App", requestedPriority: "HIGH", itPriority: "URGENT", status: "OPEN", assigned: false },
    { summary: "Email attachments fail to download on office laptop", description: "Mail opens normally but attachments fail to download. Support has requested the browser version and a screenshot of the error from the requester.", category: "Software", system: "Email", requestedPriority: "MEDIUM", itPriority: "MEDIUM", status: "WAITING_FOR_REQUESTER", assigned: true },
    { summary: "Laptop docking station does not detect external monitor", description: "The office laptop charges through the dock but the external monitor stays blank. A replacement cable and another display port have already been tried.", category: "Hardware", system: "Corporate Laptop", requestedPriority: "MEDIUM", itPriority: "LOW", status: "NEW", assigned: false },
    { summary: "Grade submission page times out when saving marks", description: "Saving marks for a large class times out. Support is investigating slow database requests before the grade submission deadline.", category: "Software", system: "Grade Submission App", requestedPriority: "HIGH", itPriority: "URGENT", status: "IN_PROGRESS", assigned: true },
    { summary: "Campus Wi-Fi unavailable in seminar room B204", description: "Several attendees cannot see the Campus Wi-Fi network in seminar room B204. Connections work in the corridor outside the room.", category: "Network", system: "Campus Wi-Fi", requestedPriority: "HIGH", itPriority: "HIGH", status: "OPEN", assigned: false },
    { summary: "Shared mailbox access restored for department assistant", description: "The department assistant could not open the shared mailbox. The mailbox permission was corrected and the requester is confirming access.", category: "Account and Access", system: "Email", requestedPriority: "MEDIUM", itPriority: "MEDIUM", status: "RESOLVED", assigned: true },
    { summary: "Printer queue shows jobs from a retired workstation", description: "The shared printer queue contains old jobs from a workstation that has been replaced. Please review and clear the obsolete queue entries.", category: "Software", system: "Printer", requestedPriority: "LOW", itPriority: "LOW", status: "NEW", assigned: false },
    { summary: "VPN sign-in issue returned after client restart", description: "The earlier VPN sign-in fix worked until the client restarted. The requester supplied a fresh error log and the ticket has been reopened for investigation.", category: "Account and Access", system: "VPN", requestedPriority: "HIGH", itPriority: "HIGH", status: "REOPENED", assigned: true },
    { summary: "Duplicate request for a replacement laptop charger", description: "The requester confirmed a charger was already provided through the department's equipment request. This duplicate support request was cancelled.", category: "Hardware", system: "Corporate Laptop", requestedPriority: "LOW", itPriority: "LOW", status: "CANCELLED", assigned: false },
    { summary: "LEB2 course access confirmed after enrolment sync", description: "The enrolment synchronisation completed and the requester confirmed the correct courses are visible. No further support is required.", category: "Account and Access", system: "LEB2 App", requestedPriority: "LOW", itPriority: "LOW", status: "CLOSED", assigned: true },
  ];
  const [requesters, staffMembers, activeCategories, activeSystems] = await Promise.all([
    prisma.user.findMany({ where: { role: "REQUESTER", isActive: true }, orderBy: { id: "asc" } }),
    prisma.user.findMany({ where: { role: "IT_STAFF", isActive: true }, orderBy: { id: "asc" } }),
    prisma.category.findMany({ where: { isActive: true } }),
    prisma.relatedSystem.findMany({ where: { isActive: true } }),
  ]);
  if (!requesters.length || !staffMembers.length) throw new Error("Active Requester and IT Staff users are required for the queue seed.");
  for (const [index, example] of queueExamples.entries()) {
    const category = activeCategories.find(value => value.name === example.category);
    const system = activeSystems.find(value => value.name === example.system);
    if (!category || !system) throw new Error(`Missing active reference data for queue seed: ${example.summary}`);
    const ticketNumber = `TKT-LAB3-QUEUE-${String(index + 1).padStart(3, "0")}`;
    const createdAt = new Date(Date.UTC(2026, 8, 14 + index, 9));
    await prisma.ticket.upsert({
      where: { ticketNumber },
      update: {},
      create: {
        ticketNumber, summary: example.summary, description: example.description,
        requesterId: requesters[index % requesters.length].id,
        assignedStaffId: example.assigned ? staffMembers[Math.floor(index / 2) % staffMembers.length].id : null,
        categoryId: category.id, relatedSystemId: system.id,
        requestedPriority: example.requestedPriority, itPriority: example.itPriority,
        currentStatus: example.status, createdAt,
        updatedAt: new Date(createdAt.getTime() + (example.status === "NEW" ? 0 : 6 * 60 * 60 * 1000)),
      },
    });
  }
  console.log(`Lab 3 queue examples seeded. Total tickets: ${await prisma.ticket.count()}`);

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
