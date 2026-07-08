import { Suspense } from "react";
import SuccessContent from "./success-content";

export default function SuccessPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-center text-od-text-muted">Loading...</p>
      }
    >
      <SuccessContent slug={params.slug} />
    </Suspense>
  );
}
