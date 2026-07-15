import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

const uploadthingFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    credentials: "include",
  });

export const UploadButton = generateUploadButton<OurFileRouter>({
  fetch: uploadthingFetch,
});
export const UploadDropzone = generateUploadDropzone<OurFileRouter>({
  fetch: uploadthingFetch,
});
export const { useUploadThing } = generateReactHelpers<OurFileRouter>({
  fetch: uploadthingFetch,
});
