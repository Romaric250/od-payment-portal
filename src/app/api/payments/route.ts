import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { dynamicCheckoutSchema, checkoutSchema } from "@/lib/validators";
import { fapshiService } from "@/lib/fapshi";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getAppUrl } from "@/lib/app-url";
import { env } from "@/lib/env";
import {
  calculatePaymentAmount,
  extractPayerInfo,
  serializeFormResponses,
  TSHIRT_QUANTITY_KEY,
  validateFormResponses,
  validateNetworkMatch,
} from "@/lib/forms";
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

    const category = await prisma.category.findFirst({
      where: { slug: body.categorySlug, isActive: true },
      include: { formFields: { orderBy: { order: "asc" } } },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const hasCustomFields = category.formFields.length > 0;

    if (!hasCustomFields) {
      const parsed = checkoutSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid input" },
          { status: 400 }
        );
      }

      const responses: Record<string, string> = {};
      if (category.categoryType === "TSHIRT") {
        const qty = body.quantity != null ? Number(body.quantity) : 1;
        responses[TSHIRT_QUANTITY_KEY] = String(qty);
      }

      const customAmount =
        body.customAmount != null ? Number(body.customAmount) : undefined;

      const amountResult = calculatePaymentAmount(
        category,
        [],
        responses,
        customAmount
      );
      if ("error" in amountResult) {
        return NextResponse.json({ error: amountResult.error }, { status: 400 });
      }

      const externalId = randomUUID();

      return processPayment({
        request,
        category,
        payerName: parsed.data.payerName,
        payerEmail: parsed.data.payerEmail,
        payerPhone: parsed.data.payerPhone,
        network: parsed.data.network,
        amount: amountResult.amount,
        externalId,
        formResponses:
          category.categoryType === "TSHIRT"
            ? [{ fieldKey: TSHIRT_QUANTITY_KEY, value: responses[TSHIRT_QUANTITY_KEY] }]
            : [],
      });
    }

    const parsed = dynamicCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const formError = validateFormResponses(
      category.formFields,
      parsed.data.formResponses
    );
    if (formError) {
      return NextResponse.json({ error: formError }, { status: 400 });
    }

    const payerResult = extractPayerInfo(
      category.formFields,
      parsed.data.formResponses,
      {
        payerName: parsed.data.payerName,
        payerEmail: parsed.data.payerEmail,
        payerPhone: parsed.data.payerPhone,
      }
    );
    if ("error" in payerResult) {
      return NextResponse.json({ error: payerResult.error }, { status: 400 });
    }

    const networkError = validateNetworkMatch(
      payerResult.payerPhone,
      parsed.data.network
    );
    if (networkError) {
      return NextResponse.json({ error: networkError }, { status: 400 });
    }

    const amountResult = calculatePaymentAmount(
      category,
      category.formFields,
      parsed.data.formResponses,
      parsed.data.customAmount
    );
    if ("error" in amountResult) {
      return NextResponse.json({ error: amountResult.error }, { status: 400 });
    }

    const externalId = randomUUID();
    const tshirtQuantityExtra =
      category.categoryType === "TSHIRT" &&
      !category.formFields.some((field) => field.affectsPrice) &&
      parsed.data.formResponses[TSHIRT_QUANTITY_KEY]
        ? {
            [TSHIRT_QUANTITY_KEY]: parsed.data.formResponses[TSHIRT_QUANTITY_KEY],
          }
        : undefined;

    const formResponses = serializeFormResponses(
      category.formFields,
      parsed.data.formResponses,
      tshirtQuantityExtra
    );

    return processPayment({
      request,
      category,
      payerName: payerResult.payerName,
      payerEmail: payerResult.payerEmail,
      payerPhone: payerResult.payerPhone,
      network: parsed.data.network,
      amount: amountResult.amount,
      externalId,
      formResponses,
    });
  } catch (error) {
    logError("POST /api/payments unexpected error", serializeError(error));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function processPayment({
  request,
  category,
  payerName,
  payerEmail,
  payerPhone,
  network,
  amount,
  externalId,
  formResponses,
}: {
  request: Request;
  category: { id: string; slug: string; name: string };
  payerName: string;
  payerEmail: string;
  payerPhone: string;
  network: "MTN" | "ORANGE";
  amount: number;
  externalId: string;
  formResponses: Array<{ fieldKey: string; value: string }>;
}) {
  logInfo("POST /api/payments initiating", {
    categorySlug: category.slug,
    categoryId: category.id,
    amount,
    email: payerEmail,
    externalId,
    fapshiEnv: env.fapshiEnv,
    fapshiBaseUrl: env.fapshiBaseUrl,
  });

  const payment = await prisma.payment.create({
    data: {
      categoryId: category.id,
      payerName,
      payerEmail,
      payerPhone,
      network,
      amount,
      externalId,
      status: "INITIATED",
      formResponses:
        formResponses.length > 0
          ? { create: formResponses }
          : undefined,
    },
  });

  const appUrl = getAppUrl(request);
  const redirectUrl = `${appUrl}/pay/${category.slug}/success?paymentId=${payment.id}`;

  logInfo("POST /api/payments redirect URL", { appUrl, redirectUrl });

  try {
    const fapshiResponse = await fapshiService.initiatePay({
      amount,
      email: payerEmail,
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
      amount,
      email: payerEmail,
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
}
