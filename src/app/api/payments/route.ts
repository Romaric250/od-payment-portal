import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validators";
import { fapshiService } from "@/lib/fapshi";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { logError, logInfo, serializeError, getErrorMessage } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = rateLimit(`payments:${ip}`, 10, 60_000);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many payment attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      logError("POST /api/payments validation failed", {
        issues: parsed.error.issues,
        body,
      });
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const category = await prisma.category.findFirst({
      where: { slug: parsed.data.categorySlug, isActive: true },
    });

    if (!category) {
      logError("POST /api/payments category not found", {
        categorySlug: parsed.data.categorySlug,
      });
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const externalId = randomUUID();

    logInfo("POST /api/payments initiating", {
      categorySlug: category.slug,
      categoryId: category.id,
      amount: category.price,
      email: parsed.data.payerEmail,
      externalId,
      fapshiEnv: env.fapshiEnv,
      fapshiBaseUrl: env.fapshiBaseUrl,
    });

    const payment = await prisma.payment.create({
      data: {
        categoryId: category.id,
        payerName: parsed.data.payerName,
        payerEmail: parsed.data.payerEmail,
        payerPhone: parsed.data.payerPhone,
        network: parsed.data.network,
        amount: category.price,
        externalId,
        status: "INITIATED",
      },
    });

    const redirectUrl = `${env.appUrl}/pay/${category.slug}/success?paymentId=${payment.id}`;

    try {
      const fapshiResponse = await fapshiService.initiatePay({
        amount: category.price,
        email: parsed.data.payerEmail,
        externalId,
        userId: payment.id,
        redirectUrl,
        message: `${category.name} — Open Dreams`,
      });

      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          fapshiTransId: fapshiResponse.transId,
          status: "PENDING",
        },
      });

      logInfo("POST /api/payments success", {
        paymentId: updated.id,
        externalId: updated.externalId,
        transId: updated.fapshiTransId,
        link: fapshiResponse.link,
      });

      return NextResponse.json({
        id: updated.id,
        externalId: updated.externalId,
        transId: updated.fapshiTransId,
        status: updated.status,
        link: fapshiResponse.link,
        redirectUrl,
      });
    } catch (error) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });

      logError("POST /api/payments Fapshi failed", {
        paymentId: payment.id,
        externalId,
        categorySlug: category.slug,
        amount: category.price,
        email: parsed.data.payerEmail,
        ...serializeError(error),
      });

      const message = getErrorMessage(error);
      return NextResponse.json(
        {
          error: message.startsWith("Fapshi")
            ? message
            : `Payment initiation failed: ${message}`,
        },
        { status: 502 }
      );
    }
  } catch (error) {
    logError("POST /api/payments unexpected error", serializeError(error));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
