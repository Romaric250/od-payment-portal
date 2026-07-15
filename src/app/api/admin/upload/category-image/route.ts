import { NextResponse } from "next/server";
import {
  getAdminSession,
  authErrorResponse,
  requireWrite,
} from "@/lib/permissions";
import { utapi } from "@/lib/utapi";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireWrite(await getAdminSession());

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image (PNG, JPG, or WEBP)" },
        { status: 400 }
      );
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be 4MB or smaller" },
        { status: 400 }
      );
    }

    logInfo("POST /api/admin/upload/category-image", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const result = await utapi.uploadFiles(file);

    if (result.error || !result.data) {
      logError("UploadThing upload failed", {
        error: result.error?.message ?? "Unknown error",
      });
      return NextResponse.json(
        { error: result.error?.message ?? "Upload failed" },
        { status: 502 }
      );
    }

    const url = result.data.ufsUrl ?? result.data.url;
    if (!url) {
      return NextResponse.json(
        { error: "Upload failed: no URL returned" },
        { status: 502 }
      );
    }

    logInfo("POST /api/admin/upload/category-image success", { url });

    return NextResponse.json({ url });
  } catch (error) {
    return authErrorResponse(error);
  }
}
