import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

interface ConversionRequestRejectCardProps {
  rejectionReason: string;
  isMutating: boolean;
  isRejecting: boolean;
  onReasonChange: (reason: string) => void;
  onReject: () => void;
}

export function ConversionRequestRejectCard({
  rejectionReason,
  isMutating,
  isRejecting,
  onReasonChange,
  onReject,
}: ConversionRequestRejectCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reject request</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div>
          <Label htmlFor="rejection-reason">Rejection reason</Label>
          <Textarea
            id="rejection-reason"
            maxLength={1000}
            value={rejectionReason}
            onChange={(event) => onReasonChange(event.target.value)}
            disabled={isMutating}
          />
        </div>
        <Button
          intent="destructive"
          disabled={isMutating}
          isLoading={isRejecting}
          onClick={onReject}
        >
          Reject request
        </Button>
      </CardContent>
    </Card>
  );
}
