import { useTranslation } from "react-i18next";
import type { CommandFeedback as Feedback } from "../model/use-delegated-command";

export function CommandFeedback({ feedback }: { feedback: Feedback | null }) {
  const { t } = useTranslation("platform-access-session");
  return (
    <p role={feedback?.tone === "alert" ? "alert" : "status"} className="min-h-5 text-sm">
      {feedback ? t(feedback.key) : null}
    </p>
  );
}
