import type { Metadata } from "next";
import { env } from "@/lib/env";

export const LOGO_CDN_URL =
  "https://g9kbtbs1bu.ufs.sh/f/woziFUfAWTFp7lFzT6vRlS1GrWLQhwZMzocm87npUf63sV5v";

export const FAVICON_CDN_URL =
  "https://g9kbtbs1bu.ufs.sh/f/woziFUfAWTFp2QWpmhsZSxCkjUVIsmGO63vNt9rbXzKeBuEo";

export const LOGO_PATH = "/odlogo.png";

export const siteConfig = {
  name: "Open Dreams",
  portalName: "Payment Portal",
  description:
    "Secure payments for Open Dreams programs, events, and merchandise via MTN Mobile Money and Orange Money.",
  logoPath: LOGO_PATH,
  logoUrl: LOGO_CDN_URL,
};

export function absoluteUrl(path: string): string {
  const base = env.appUrl.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildMetadata({
  title,
  description,
  path = "/",
  image,
}: {
  title: string;
  description: string;
  path?: string;
  image?: string;
}): Metadata {
  const url = absoluteUrl(path);
  const ogImage = image ?? LOGO_CDN_URL;

  return {
    title,
    description,
    metadataBase: new URL(env.appUrl),
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: siteConfig.name,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: siteConfig.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export const defaultMetadata: Metadata = {
  ...buildMetadata({
    title: `${siteConfig.name} ${siteConfig.portalName}`,
    description: siteConfig.description,
    path: "/",
  }),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: FAVICON_CDN_URL, sizes: "any" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/odlogo.png", type: "image/png" }],
  },
};
