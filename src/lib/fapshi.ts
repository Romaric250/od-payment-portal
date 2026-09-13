import axios, { type AxiosInstance, isAxiosError } from "axios";
import crypto from "crypto";
import { env } from "@/lib/env";
import { logError, logInfo, getErrorMessage } from "@/lib/logger";
import type { PaymentStatus } from "@prisma/client";

export interface FapshiInitiatePayResponse {
  transId: string;
  message: string;
  link: string;
  dateInitiated?: string;
}

export interface FapshiStatusResponse {
  transId: string;
  externalId?: string;
  status: string;
  amount: number;
  phone?: string;
  message?: string;
  date?: string;
  financialTransId?: string;
}

export interface FapshiWebhookEvent {
  transId: string;
  externalId?: string;
  userId?: string;
  status: string;
  amount?: number;
  revenue?: number;
  phone?: string;
  payerName?: string;
  email?: string;
  message?: string;
  date?: string;
  dateConfirmed?: string;
  financialTransId?: string;
  [key: string]: unknown;
}

export interface ProcessedWebhookEvent {
  transactionId: string;
  externalId: string;
  userId?: string;
  status: PaymentStatus;
  amount: number;
  phoneNumber: string;
  financialTransId?: string;
  confirmedAt?: Date;
}

function mapFapshiStatus(fapshiStatus: string): PaymentStatus {
  switch (fapshiStatus.toUpperCase()) {
    case "SUCCESSFUL":
    case "SUCCESS":
      return "SUCCESSFUL";
    case "FAILED":
      return "FAILED";
    case "EXPIRED":
      return "EXPIRED";
    case "PENDING":
    case "CREATED":
      return "PENDING";
    default:
      return "PENDING";
  }
}

function maskSecret(value: string): string {
  if (!value) return "(empty)";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export class FapshiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.fapshiBaseUrl,
      headers: {
        "Content-Type": "application/json",
        apiuser: env.fapshiApiUser,
        apikey: env.fapshiApiKey,
      },
      timeout: 30000,
    });

    this.client.interceptors.request.use(
      (config) => {
        logInfo("Fapshi API Request", {
          method: config.method?.toUpperCase(),
          url: `${config.baseURL ?? ""}${config.url ?? ""}`,
          data: config.data,
        });
        return config;
      },
      (error) => {
        logError("Fapshi API Request Error", {
          error: isAxiosError(error) ? error.message : String(error),
        });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logInfo("Fapshi API Response", {
          status: response.status,
          url: response.config.url,
          data: response.data,
        });
        return response;
      },
      (error) => {
        logError("Fapshi API Response Error", {
          ...(isAxiosError(error)
            ? {
                status: error.response?.status,
                url: error.config?.url,
                responseData: error.response?.data,
                message: error.message,
              }
            : { error: String(error) }),
        });
        return Promise.reject(error);
      }
    );
  }

  async initiatePay(params: {
    amount: number;
    email: string;
    externalId: string;
    userId: string;
    redirectUrl: string;
    message?: string;
  }): Promise<FapshiInitiatePayResponse> {
    const { amount, email, externalId, userId, redirectUrl, message } = params;

    if (!env.fapshiApiUser || !env.fapshiApiKey) {
      logError("Fapshi Config", {
        fapshiEnv: env.fapshiEnv,
        baseUrl: env.fapshiBaseUrl,
        apiUser: maskSecret(env.fapshiApiUser),
        apiKey: maskSecret(env.fapshiApiKey),
        error: "FAPSHI_API_USER or FAPSHI_API_KEY is missing",
      });
      throw new Error(
        "Fapshi is not configured. Set FAPSHI_API_USER and FAPSHI_API_KEY in .env"
      );
    }

    if (amount < 100) {
      throw new Error("Minimum payment amount is 100 XAF");
    }

    const payload = {
      amount,
      email,
      externalId,
      userId,
      redirectUrl,
      message: message ?? `Open Dreams payment — ${externalId}`,
    };

    try {
      const response = await this.client.post<FapshiInitiatePayResponse>(
        "/initiate-pay",
        payload
      );

      if (!response.data.link) {
        throw new Error("Fapshi did not return a payment link");
      }

      logInfo("Fapshi initiate-pay success", {
        externalId,
        transId: response.data.transId,
        link: response.data.link,
      });

      return response.data;
    } catch (error) {
      logError("Fapshi initiate-pay failed", {
        externalId,
        payload,
        fapshiEnv: env.fapshiEnv,
        baseUrl: env.fapshiBaseUrl,
        apiUser: maskSecret(env.fapshiApiUser),
        error: getErrorMessage(error),
        ...(isAxiosError(error)
          ? {
              status: error.response?.status,
              responseData: error.response?.data,
            }
          : {}),
      });

      throw new Error(
        `Fapshi payment initiation failed: ${getErrorMessage(error)}`
      );
    }
  }

  async checkPaymentStatus(transId: string): Promise<FapshiStatusResponse> {
    try {
      const response = await this.client.get<FapshiStatusResponse>(
        `/payment-status/${transId}`
      );
      return response.data;
    } catch (error) {
      logError("Fapshi payment-status check failed", {
        transId,
        error: getErrorMessage(error),
        ...(isAxiosError(error)
          ? {
              status: error.response?.status,
              responseData: error.response?.data,
            }
          : {}),
      });
      throw new Error(`Failed to check payment status: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Fapshi sends the dashboard webhook secret as `x-wh-secret`.
   * https://docs.fapshi.com/en/api-reference/endpoint/webhook
   */
  verifyWebhookSecret(headerSecret?: string | null): boolean {
    const expected = env.fapshiWebhookSecret;
    if (!expected) {
      return true;
    }
    if (!headerSecret) {
      return false;
    }

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(headerSecret);
    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  processWebhook(
    event: FapshiWebhookEvent | FapshiWebhookEvent[]
  ): ProcessedWebhookEvent {
    const raw = Array.isArray(event) ? event[0] : event;
    if (!raw) {
      throw new Error("Empty webhook payload");
    }

    if (!raw.transId && !raw.externalId && !raw.userId) {
      throw new Error("Webhook missing transId, externalId, and userId");
    }

    const confirmedAt = raw.dateConfirmed
      ? new Date(raw.dateConfirmed)
      : raw.date
        ? new Date(raw.date)
        : undefined;

    return {
      transactionId: raw.transId,
      externalId: raw.externalId ?? "",
      userId: typeof raw.userId === "string" ? raw.userId : undefined,
      status: mapFapshiStatus(raw.status),
      amount: typeof raw.amount === "number" ? raw.amount : 0,
      phoneNumber: raw.phone ?? "",
      financialTransId: raw.financialTransId,
      confirmedAt,
    };
  }

  mapStatus(status: string): PaymentStatus {
    return mapFapshiStatus(status);
  }
}

export const fapshiService = new FapshiService();
