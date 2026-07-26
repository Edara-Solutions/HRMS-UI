import { Card, CardContent } from "@/shared/ui/card";

interface ConversionRequestTerminalCardProps {
  rejectionReason: string | null;
}

export function ConversionRequestTerminalCard({
  rejectionReason,
}: ConversionRequestTerminalCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="font-medium">This request is terminal and cannot be changed.</p>
        {rejectionReason && (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Reason: {rejectionReason}</p>
        )}
      </CardContent>
    </Card>
  );
}
