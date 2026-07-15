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
    const tshirt = await prisma.category.create({
      data: {
        name: "T-Shirts",
        slug: "t-shirts",
        description: "Official Open Dreams T-shirt",
        price: 6000,
        images: [],
        categoryType: "TSHIRT",
        statusPipeline: [
          "Order Received",
          "Printed",
          "Ready for Pickup",
          "Delivered",
        ],
        displayOrder: 1,
      },
    });

    await prisma.formField.createMany({
      data: [
        {
          categoryId: tshirt.id,
          label: "Name",
          key: "name",
          type: "TEXT",
          required: true,
          order: 0,
        },
        {
          categoryId: tshirt.id,
          label: "Phone Number",
          key: "phone",
          type: "PHONE",
          required: true,
          order: 1,
        },
        {
          categoryId: tshirt.id,
          label: "Email",
          key: "email",
          type: "EMAIL",
          required: true,
          order: 2,
        },
        {
          categoryId: tshirt.id,
          label: "T-Shirt Size",
          key: "size",
          type: "SELECT",
          required: true,
          options: ["S", "M", "L", "XL", "XXL"],
          order: 3,
        },
        {
          categoryId: tshirt.id,
          label: "Preferred Colour",
          key: "colour",
          type: "SELECT",
          required: true,
          options: ["Black", "White", "Orange", "Navy"],
          order: 4,
        },
        {
          categoryId: tshirt.id,
          label: "Quantity",
          key: "quantity",
          type: "NUMBER",
          required: true,
          affectsPrice: true,
          order: 5,
        },
        {
          categoryId: tshirt.id,
          label: "Expected Delivery Date",
          key: "delivery_date",
          type: "DATE",
          required: false,
          order: 6,
        },
      ],
    });

    await prisma.category.createMany({
      data: [
        {
          name: "Graduation Fund",
          slug: "graduation-fund",
          description: "Support our graduation program",
          price: 5000,
          images: [],
          categoryType: "DONATION",
          allowCustomAmount: true,
          minimumAmount: 1000,
          statusPipeline: ["Received"],
          displayOrder: 2,
        },
        {
          name: "Event Ticket – 2026 Gala",
          slug: "event-ticket-2026-gala",
          description: "Ticket for the 2026 Gala event",
          price: 25000,
          images: [],
          categoryType: "EVENT",
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
