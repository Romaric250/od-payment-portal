import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@open-dreams.org";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME ?? "Super Admin";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.upsert({
    where: { email: email.toLowerCase() },
    update: {
      name,
      passwordHash,
      role: "SUPER_ADMIN",
      accessLevel: "READ_WRITE",
      isActive: true,
    },
    create: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "SUPER_ADMIN",
      accessLevel: "READ_WRITE",
      isActive: true,
    },
  });

  const settings = await prisma.settings.findFirst();
  if (!settings) {
    await prisma.settings.create({
      data: {
        notificationEmails: [email.toLowerCase()],
        orgName: "Open Dreams",
      },
    });
  }

  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    await prisma.category.createMany({
      data: [
        {
          name: "T-Shirts",
          slug: "t-shirts",
          description: "Official Open Dreams T-shirt",
          price: 15000,
          images: [],
          statusPipeline: [
            "Order Received",
            "Printed",
            "Ready for Pickup",
            "Delivered",
          ],
          displayOrder: 1,
        },
        {
          name: "Graduation Fund",
          slug: "graduation-fund",
          description: "Support our graduation program",
          price: 5000,
          images: [],
          statusPipeline: ["Received"],
          displayOrder: 2,
        },
        {
          name: "Event Ticket – 2026 Gala",
          slug: "event-ticket-2026-gala",
          description: "Ticket for the 2026 Gala event",
          price: 25000,
          images: [],
          statusPipeline: ["Registered", "Confirmed", "Attended"],
          displayOrder: 3,
        },
      ],
    });
  }

  console.log("Seed complete:");
  console.log(`  Super Admin: ${admin.email}`);
  console.log(`  Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
