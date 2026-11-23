import { useTranslation } from "react-i18next";
import { Badge } from "@/shared/ui/badge";
import {
  type AccessRequest,
  grantedMinutes,
  grantedScope,
  isNarrowed,
} from "../model/access-request";
import { useLengthLabel } from "./access-fields";

interface AccessScopeLengthProps {
  request: AccessRequest;
}

export function AccessScopeLength({ request }: AccessScopeLengthProps) {
  const { t } = useTranslation("platform-access-session");
  const lengthLabel = useLengthLabel();
  const scope = grantedScope(request);
  return (
    <div className="space-y-1">
      <Badge>{t(`access.scope.${scope}`)}</Badge>
      <p className="text-xs tabular-nums text-[var(--color-text-muted)]">
        {lengthLabel(grantedMinutes(request))}
        {isNarrowed(request) && (
          <s className="ms-1 text-[var(--color-text-faint)]">
            <span className="sr-only">{t("access.requested")}: </span>
            {t("access.scopeLength", {
              scope: t(`access.scope.${request.scope}`),
              length: lengthLabel(request.requestedMinutes),
            })}
          </s>
        )}
      </p>
    </div>
  );
}
