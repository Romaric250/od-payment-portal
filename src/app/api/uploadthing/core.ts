import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getToken } from "next-auth/jwt";

const f = createUploadthing();

export const ourFileRouter = {
  categoryImage: f(
    { image: { maxFileSize: "4MB", maxFileCount: 5 } },
    { awaitServerData: false }
  )
    .middleware(async ({ req }) => {
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!token?.id) {
        throw new UploadThingError("You must be signed in to upload images");
      }

      if (token.accessLevel !== "READ_WRITE") {
        throw new UploadThingError("Read-only admins cannot upload images");
      }

      return { adminId: token.id as string };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl ?? file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
