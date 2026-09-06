/**
 * Put the Project Moon 15k successful payments back on Project Moon.
 * If the record is still on Graduate Summit, move it off Summit onto Moon.
 * If it was deleted, recreate it on Moon.
 *
 * Usage:
 *   npx tsx scripts/restore-moon-from-summit.ts --execute
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { detectNetwork } from "../src/lib/validators";

const SUMMIT_ID = "6a68d3d175496544cd212166";
const MOON_ID = "6a5f5f500e0a413246b551fc";

const MOON_PAYMENT_IDS = [
  "6a61e0f6c5a19400c6cc62c6",
  "6a633c317ffef9f44b362d73",
  "6a6393a53677a5bd7334485e",
  "6a63ae642bc99b740f37f519",
  "6a650260ebb1186e62fbb825",
  "6a65a1a81f35e4fe8f4b947d",
  "6a6657312c2199fd72e713a3",
  "6a66626f01cb8911b7128036",
  "6a67afaca3798aee927f1ba1",
  "6a67c5d5873dfcf03990f00d",
  "6a6c47a4e08ba2d382078b92",
  "6a6c96282b8f297639e55ec7",
  "6a6d819c08f5ca359f5cad2a",
  "6a6da6fb11ab34509826c85a",
  "6a6e06b2fab84b40e76389c7",
  "6a6e38df4c2933ebac96b104",
  "6a6e3cf67f062285d62ae4ad",
  "6a6ed1a593da00a859e3a176",
  "6a6ef529ddb412c312cd1edc",
  "6a6f54aa8634e2f56ce8c172",
  "6a6f890912af3ee0fd7dcfb2",
  "6a6f8a8a12af3ee0fd7dcfb4",
  "6a703e17369a71cdbbd007ed",
  "6a707f6a3363d69342d0a9bc",
  "6a70c67736730edb2440a2a0",
  "6a70ebcd58c71460316051b1",
  "6a712cd025ca351d90669cbd",
  "6a72ef3a506a7f6ee64d4307",
];

const DELETED_TO_RECREATE = [
  {
    id: "6a6393a53677a5bd7334485e",
    payerName: "Guachuessi François Junior",
    payerEmail: "guachuessijunior@gmail.com",
    payerPhone: "673643649",
    fapshiTransId: "RwyMmid0",
    externalId: "1f2358ac-cf5c-4d59-af63-546d6d914f3d",
    financialTransId: "18064153730",
    network: "MTN" as const,
    createdAt: new Date("2026-07-24T16:32:37.748Z"),
    confirmedAt: new Date("2026-07-24T16:33:39.830Z"),
  },
  {
    id: "6a63ae642bc99b740f37f519",
    payerName: "BALAK BINTA CHAK",
    payerEmail: "francisbalaktangu@gmail.com",
    payerPhone: "675834583",
    fapshiTransId: "MEn1kbCb",
    externalId: "aa0f2c8e-db49-4bb4-9d68-7e9b049b3388",
    financialTransId: "18065949805",
    network: "MTN" as const,
    createdAt: new Date("2026-07-24T18:26:44.394Z"),
    confirmedAt: new Date("2026-07-24T18:27:38.037Z"),
  },
  {
    id: "6a65a1a81f35e4fe8f4b947d",
    payerName: "Dingana Romeo Bengyella",
    payerEmail: "melvismelvis655@gmail.com",
    payerPhone: "674975439",
    fapshiTransId: "jhVxHV2z",
    externalId: "2271a8f0-31ad-462b-a7e1-ad38d4daa5e6",
    financialTransId: "18083498870",
    network: "MTN" as const,
    createdAt: new Date("2026-07-26T05:56:56.222Z"),
    confirmedAt: new Date("2026-07-26T05:58:40.571Z"),
  },
  {
    id: "6a66626f01cb8911b7128036",
    payerName: "TAYIMETHA OYONO JULES MATHIEU",
    payerEmail: "oyonojules7@gmail.com",
    payerPhone: "679507286",
    fapshiTransId: "u91nM1kC",
    externalId: "f929f7bf-5fdc-421f-be44-44e37067de3d",
    financialTransId: "18094388707",
    network: "MTN" as const,
    createdAt: new Date("2026-07-26T19:39:27.864Z"),
    confirmedAt: new Date("2026-07-26T19:40:33.576Z"),
  },
  {
    id: "6a67afaca3798aee927f1ba1",
    payerName: "Kpue Theresia Favour Bei",
    payerEmail: "kpuefavour@gmail.com",
    payerPhone: "677472152",
    fapshiTransId: "j3HZYDEe",
    externalId: "15af2848-1281-490b-941b-a96e8f7e50a9",
    financialTransId: "18107447312",
    network: "MTN" as const,
    createdAt: new Date("2026-07-27T19:21:16.465Z"),
    confirmedAt: new Date("2026-07-27T19:22:34.783Z"),
  },
  {
    id: "6a6e3cf67f062285d62ae4ad",
    payerName: "Tikum Visvette Tikum",
    payerEmail: "tikumvisvette@gmail.com",
    payerPhone: "654970113",
    fapshiTransId: "8ntZbMb4",
    externalId: "75b82a95-c5d1-43ba-89e8-0c0020a2e65a",
    financialTransId: null as string | null,
    network: "MTN" as const,
    createdAt: new Date("2026-08-01T18:37:42.392Z"),
    confirmedAt: new Date("2026-08-01T18:38:00.000Z"),
  },
  {
    id: "6a6ed1a593da00a859e3a176",
    payerName: "Njatou Njoya lawrence junior",
    payerEmail: "njoyajunior17@gmail.com",
    payerPhone: "640851558",
    fapshiTransId: "Ebsq3A9E",
    externalId: "66a29d5b-6f5f-44c7-bf70-5c701860c326",
    financialTransId: null as string | null,
    network: "ORANGE" as const,
    createdAt: new Date("2026-08-02T05:12:05.096Z"),
    confirmedAt: new Date("2026-08-02T05:13:00.000Z"),
  },
  {
    id: "6a6f54aa8634e2f56ce8c172",
    payerName: "Monji Randy Junior",
    payerEmail: "monjirandy4@gmail.com",
    payerPhone: "673881054",
    fapshiTransId: "cxcWlcfi",
    externalId: "402a2d91-ee64-4031-a141-75a30d102aba",
    financialTransId: null as string | null,
    network: "MTN" as const,
    createdAt: new Date("2026-08-02T14:31:06.105Z"),
    confirmedAt: new Date("2026-08-02T14:32:00.000Z"),
  },
  {
    id: "6a6f890912af3ee0fd7dcfb2",
    payerName: "TCHINDA MEKONTSO ERNEST GAËL",
    payerEmail: "ernesttchindagael@gmail.com",
    payerPhone: "650858154",
    fapshiTransId: "Lu0SxbXt",
    externalId: "5bd06b27-eaf6-403c-9ff8-61a19b3a368a",
    financialTransId: null as string | null,
    network: "MTN" as const,
    createdAt: new Date("2026-08-02T18:14:33.115Z"),
    confirmedAt: new Date("2026-08-02T18:25:00.000Z"),
  },
  {
    id: "6a70c67736730edb2440a2a0",
    payerName: "Tata Dorcas Jingkoh",
    payerEmail: "jingkohdorcas101@gmail.com",
    payerPhone: "682683590",
    fapshiTransId: "NdKqTvYW",
    externalId: "b6dad35d-6bdb-42a5-b78c-c85d951e2c3c",
    financialTransId: null as string | null,
    network: "MTN" as const,
    createdAt: new Date("2026-08-03T16:48:55.448Z"),
    confirmedAt: new Date("2026-08-03T16:51:00.000Z"),
  },
  {
    id: "6a712cd025ca351d90669cbd",
    payerName: "Jemimah Neh Foba",
    payerEmail: "jemimahneh18@gmail.com",
    payerPhone: "672143570",
    fapshiTransId: "j6q10b4j",
    externalId: "2b9f7336-18e8-4a11-ba96-7f10a44a5752",
    financialTransId: null as string | null,
    network: "MTN" as const,
    createdAt: new Date("2026-08-04T00:05:36.043Z"),
    confirmedAt: new Date("2026-08-04T00:09:00.000Z"),
  },
];

async function main() {
  const prisma = new PrismaClient();
  const execute = process.argv.includes("--execute");

  const moonBefore = await prisma.payment.count({ where: { categoryId: MOON_ID } });
  const summitBefore = await prisma.payment.count({ where: { categoryId: SUMMIT_ID } });

  const report = {
    alreadyOnMoon: [] as string[],
    movedFromSummit: [] as string[],
    recreated: [] as string[],
    missing: [] as string[],
  };

  console.log(`Mode: ${execute ? "EXECUTE" : "DRY RUN"}`);
  console.log(`Project Moon before: ${moonBefore}`);
  console.log(`Graduate Summit before: ${summitBefore}\n`);

  for (const id of MOON_PAYMENT_IDS) {
    const existing = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        categoryId: true,
        payerName: true,
        payerEmail: true,
        status: true,
        amount: true,
      },
    });

    if (existing) {
      if (existing.categoryId === MOON_ID) {
        report.alreadyOnMoon.push(`${existing.payerName} (${id})`);
        console.log(`Already on Moon: ${existing.payerName}`);
        continue;
      }

      console.log(
        `Remove from Summit, put on Moon: ${existing.payerName} (${existing.status} ${existing.amount})`
      );
      report.movedFromSummit.push(`${existing.payerName} (${id})`);

      if (execute) {
        await prisma.payment.update({
          where: { id },
          data: { categoryId: MOON_ID },
        });
      }
      continue;
    }

    const seed = DELETED_TO_RECREATE.find((row) => row.id === id);
    if (!seed) {
      report.missing.push(id);
      console.log(`MISSING and no recreate data: ${id}`);
      continue;
    }

    console.log(`Recreate on Moon: ${seed.payerName}`);
    report.recreated.push(`${seed.payerName} (${id})`);

    if (execute) {
      await prisma.payment.create({
        data: {
          id: seed.id,
          categoryId: MOON_ID,
          payerName: seed.payerName,
          payerEmail: seed.payerEmail,
          payerPhone: seed.payerPhone,
          network: detectNetwork(seed.payerPhone) ?? seed.network,
          amount: 15000,
          externalId: seed.externalId,
          fapshiTransId: seed.fapshiTransId,
          financialTransId: seed.financialTransId,
          status: "SUCCESSFUL",
          fulfillmentStatus: "Received",
          createdAt: seed.createdAt,
          confirmedAt: seed.confirmedAt,
        },
      });
    }
  }

  if (execute) {
    const moonAfter = await prisma.payment.count({ where: { categoryId: MOON_ID } });
    const summitAfter = await prisma.payment.count({ where: { categoryId: SUMMIT_ID } });
    console.log(`\nProject Moon after: ${moonAfter} (was ${moonBefore})`);
    console.log(`Graduate Summit after: ${summitAfter} (was ${summitBefore})`);
  } else {
    console.log("\n[DRY RUN] Re-run with --execute to apply.");
  }

  console.log("\nMoved from Summit:", report.movedFromSummit.length);
  console.log("Recreated:", report.recreated.length);
  console.log("Already on Moon:", report.alreadyOnMoon.length);
  console.log("Missing:", report.missing.length);

  const outputDir = path.join(process.cwd(), "scripts", "output");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "restore-moon-payments.json"),
    JSON.stringify({ mode: execute ? "execute" : "dry-run", report }, null, 2)
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
