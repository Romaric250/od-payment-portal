"use client";

import { Suspense } from "react";
import ProcessingContent from "./processing-content";

export default function ProcessingPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-od-text-muted">Loading...</p>}>
      <ProcessingContent slug={params.slug} />
    </Suspense>
  );
}
