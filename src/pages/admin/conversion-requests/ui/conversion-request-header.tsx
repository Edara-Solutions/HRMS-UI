import { ArrowLeft, RefreshCw } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { ConversionRequest } from "../api/conversion-requests";

interface ConversionRequestHeaderProps {
  request: ConversionRequest;
  isReloading: boolean;
  onBack: () => void;
  onReload: () => void;
}

export function ConversionRequestHeader({
  request,
  isReloading,
  onBack,
  onReload,
}: ConversionRequestHeaderProps) {
  return (
    <>
      <Button intent="navigation" leadingIcon={<ArrowLeft size={14} />} onClick={onBack}>
        Back to requests
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-bold text-[var(--color-text)]">Conversion request</h1>
            <Badge
              variant={
                request.status === "APPROVED"
                  ? "success"
                  : request.status === "REJECTED"
                    ? "danger"
                    : "warning"
              }
            >
              {request.status.toLowerCase()}
            </Badge>
          </div>
          <code className="text-xs text-[var(--color-text-muted)]">{request.publicId}</code>
        </div>
        <Button
          intent="utility"
          leadingIcon={<RefreshCw size={13} />}
          onClick={onReload}
          isLoading={isReloading}
        >
          Reload request
        </Button>
      </div>
    </>
  );
}
