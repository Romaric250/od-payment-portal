import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminLoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-od-bg px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-od-orange" />
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <p className="text-sm text-od-text-muted">Loading...</p>
        </CardContent>
      </Card>
    </div>
  );
}
