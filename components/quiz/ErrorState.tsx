import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  message?: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <Alert variant="destructive" className="max-w-4xl mx-auto">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="font-semibold">Failed to generate quiz</div>
        <div className="text-sm mt-1">
          {message || "Please try again or rephrase your request."}
        </div>
      </AlertDescription>
    </Alert>
  );
}
