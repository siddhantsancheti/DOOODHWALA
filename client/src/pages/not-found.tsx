import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-6">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-gray-900">
                404 Page Not Found
              </h1>
              <p className="text-sm text-gray-600">
                Did you forget to add the page to the router?
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
