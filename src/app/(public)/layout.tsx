import type { Metadata } from "next";
import { buildMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: `${siteConfig.name} ${siteConfig.portalName}`,
  description: siteConfig.description,
  path: "/",
});

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
