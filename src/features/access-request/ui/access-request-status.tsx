import { useTranslation } from "react-i18next";
import { Badge } from "@/shared/ui/badge";
import { type AccessRequest, accessRequestDisplay, displayTone } from "../model/access-request";

interface AccessRequestStatusProps {
  request: AccessRequest;
}

export function AccessRequestStatus({ request }: AccessRequestStatusProps) {
  const { t } = useTranslation("platform-access-session");
  const display = accessRequestDisplay(request);
  return (
    <Badge variant={displayTone[display]} className="shrink-0 whitespace-nowrap">
      {t(`access.display.${display}`)}
    </Badge>
  );
}
