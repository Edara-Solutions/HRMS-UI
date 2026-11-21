import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { type AccessRequest, accessRequestDisplay } from "../model/access-request";
import { useAccessCommand } from "../model/use-access-command";
import { CommandFailure } from "./command-failure";

interface RequestActionsProps {
  request: AccessRequest;
  blocked?: boolean;
}

export function RequestActions({ request, blocked = false }: RequestActionsProps) {
  const { t } = useTranslation("platform-access-session");
  const navigate = useNavigate();
  const command = useAccessCommand();
  const display = accessRequestDisplay(request);
  const goToSession = (sessionPublicId: string) =>
    void navigate({
      to: "/platform/access-sessions/$sessionPublicId",
      params: { sessionPublicId },
    });

  return (
    <div className="space-y-1">
      {display === "PENDING" && (
        <Button
          intent="destructive-trigger"
          size="sm"
          disabled={command.pending}
          onClick={() => command.run({ kind: "cancel", requestPublicId: request.publicId })}
        >
          {t("access.card.cancel")}
        </Button>
      )}
      {display === "APPROVED" && (
        <Button
          intent="cta"
          size="sm"
          disabled={command.pending || blocked}
          onClick={() =>
            command.run(
              { kind: "open", requestPublicId: request.publicId },
              { onSuccess: (session) => goToSession(session.publicId) },
            )
          }
        >
          {t("access.card.open")}
        </Button>
      )}
      {display === "SESSION_OPEN" && request.session && (
        <Button intent="cta" size="sm" onClick={() => goToSession(request.session?.publicId ?? "")}>
          {t("access.card.goToSession")}
        </Button>
      )}
      <CommandFailure failure={command.failure} />
    </div>
  );
}
