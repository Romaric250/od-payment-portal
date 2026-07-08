import axios from "axios";

export function logError(context: string, details: Record<string, unknown>) {
  console.error(`[${context}]`, JSON.stringify(details, null, 2));
}

export function logInfo(context: string, details: Record<string, unknown>) {
  console.info(`[${context}]`, JSON.stringify(details, null, 2));
}

export function serializeError(error: unknown): Record<string, unknown> {
  if (axios.isAxiosError(error)) {
    return {
      type: "AxiosError",
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
    };
  }

  if (error instanceof Error) {
    return {
      type: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { type: "unknown", value: String(error) };
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object" && "message" in data) {
      return String((data as { message: unknown }).message);
    }
    if (typeof data === "string" && data.length > 0) {
      return data;
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}
