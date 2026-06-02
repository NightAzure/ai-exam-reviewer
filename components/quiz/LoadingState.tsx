import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="flex items-center justify-center gap-3 p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-lg">Generating quiz...</span>
      </CardContent>
    </Card>
  );
}

