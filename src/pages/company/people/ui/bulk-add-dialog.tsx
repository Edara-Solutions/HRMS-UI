import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCompanyAccess, useCompanyMutationRecovery } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { createPeople, rosterRoot } from "../api/people";
import { type BulkSummary, parseBulkRows, summarizeBulk } from "../model/roster";
import { BulkSummaryNotice } from "./bulk-summary-notice";

const maximumRows = 100;

interface BulkAddDialogProps {
  open: boolean;
  onClose: () => void;
}

export function BulkAddDialog({ open, onClose }: BulkAddDialogProps) {
  const { t } = useTranslation("people");
  const { titleId, descriptionId } = useDialogIds();
  const inputId = useId();
  const access = useCompanyAccess();
  const recover = useCompanyMutationRecovery();
  const queryClient = useQueryClient();
  const userPublicId = access.user?.publicId ?? "";
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<{ summary: BulkSummary; labels: string[] } | null>(null);
  const create = useMutation({
    retry: false,
    mutationFn: createPeople,
    onSettled: () => queryClient.invalidateQueries({ queryKey: rosterRoot(userPublicId) }),
  });

  function close() {
    setText("");
    setProblem(null);
    setResult(null);
    onClose();
  }

  async function submit() {
    setProblem(null);
    setResult(null);
    const parsed = parseBulkRows(text);
    if (parsed.invalidLines.length > 0) {
      setProblem(t("bulkAdd.invalidLines", { lines: parsed.invalidLines.join(", ") }));
      return;
    }
    if (parsed.rows.length === 0 || parsed.rows.length > maximumRows) {
      setProblem(t("bulkAdd.rowCount", { maximum: maximumRows }));
      return;
    }
    try {
      const outcome = await create.mutateAsync(parsed.rows);
      setResult({
        summary: summarizeBulk(outcome, parsed.rows.length),
        labels: parsed.rows.map((row) => `${row.firstName} ${row.lastName}`),
      });
      setText("");
    } catch (error) {
      const outcome = await recover(error);
      setProblem(t(`outcome.${outcome.kind}`));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      dismissible={!create.isPending}
      titleId={titleId}
      descriptionId={descriptionId}
    >
      <DialogTitle id={titleId}>{t("bulkAdd.title")}</DialogTitle>
      <DialogDescription id={descriptionId}>{t("bulkAdd.description")}</DialogDescription>
      <div className="mt-4 space-y-3">
        {result ? (
          <BulkSummaryNotice
            action="create"
            summary={result.summary}
            labels={result.labels}
            onDismiss={close}
          />
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor={inputId}>{t("bulkAdd.label")}</Label>
              <Textarea
                id={inputId}
                dir="ltr"
                rows={8}
                value={text}
                placeholder="Sara, Ahmed, sara@example.com"
                disabled={create.isPending}
                onChange={(event) => setText(event.target.value)}
              />
            </div>
            {problem && (
              <p role="alert" className="text-sm">
                {problem}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button intent="dismissive" onClick={close} disabled={create.isPending}>
                {t("state.cancel")}
              </Button>
              <Button
                intent="cta"
                isLoading={create.isPending}
                disabled={create.isPending}
                onClick={() => void submit()}
              >
                {t("bulkAdd.submit")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
