import { useTranslation } from "react-i18next";
import {
  platformPlanOperations as operations,
  requestPlatformOperation,
  usePlatformAccess,
} from "@/shared/api";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import {
  type Plan,
  type Price,
  recheckPrice,
  StaleCatalogue,
  verifyTarget,
} from "../api/catalogue";
import { useCatalogueCommand } from "../model/use-catalogue-command";
import { PriceForm } from "./catalogue-form";
import { CommandFeedback } from "./command-feedback";
import { PlanForm } from "./plan-form";
export type EditorTarget =
  | { kind: "plan"; plan?: Plan }
  | { kind: "price"; plan: Plan; price?: Price };
interface Props {
  target: EditorTarget;
  close: () => void;
}
export function CatalogueEditor({ target, close }: Props) {
  const { t } = useTranslation("platform-plans");
  const access = usePlatformAccess();
  const command = useCatalogueCommand();
  const { titleId, descriptionId } = useDialogIds();
  const operation =
    target.kind === "plan"
      ? target.plan
        ? operations.update
        : operations.create
      : target.price
        ? operations.updatePrice
        : operations.createPrice;
  const disabled =
    command.pending || command.blocked || access.availability(operation.key).state !== "enabled";
  async function save(body: unknown) {
    await command.run(
      operation.key,
      async (check) => {
        if (target.kind === "plan") {
          if (target.plan) {
            const before = await requestPlatformOperation(operations.plan, {
              params: { publicId: target.plan.publicId },
              query: {},
            });
            verifyTarget(before.publicId, target.plan.publicId, operations.plan);
            if (before.updatedAt !== target.plan.updatedAt || before.deletedAt !== null)
              throw new StaleCatalogue();
            check();
            const saved = await requestPlatformOperation(operations.update, {
              params: { publicId: target.plan.publicId },
              body,
            });
            verifyTarget(saved.publicId, target.plan.publicId, operations.update);
            return saved;
          }
          return requestPlatformOperation(operations.create, { body });
        }
        if (target.price) {
          await recheckPrice(target.plan.publicId, target.price, check);
          const saved = await requestPlatformOperation(operations.updatePrice, {
            params: { publicId: target.price.publicId },
            body,
          });
          verifyTarget(saved.publicId, target.price.publicId, operations.updatePrice);
          return saved;
        }
        return requestPlatformOperation(operations.createPrice, {
          params: { publicId: target.plan.publicId },
          body,
        });
      },
      close,
    );
  }
  return (
    <Dialog
      open
      onClose={() => {
        if (!command.pending) close();
      }}
      dismissible={!command.pending}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-h-[90vh] max-w-2xl overflow-y-auto"
    >
      <DialogTitle id={titleId}>
        {t(
          target.kind === "plan"
            ? target.plan
              ? "editPlan"
              : "createPlan"
            : target.price
              ? "editPrice"
              : "createPrice",
        )}
      </DialogTitle>
      <DialogDescription id={descriptionId}>
        {t(target.kind === "plan" ? "planFormHelp" : "priceFormHelp")}
      </DialogDescription>
      <CommandFeedback command={command} />
      {target.kind === "plan" ? (
        <PlanForm
          plan={target.plan}
          disabled={disabled}
          invalidFields={command.outcome?.kind === "invalid" ? command.outcome.fields : []}
          onSubmit={(body) => void save(body)}
          onCancel={close}
        />
      ) : (
        <PriceForm
          price={target.price}
          disabled={disabled}
          invalidFields={command.outcome?.kind === "invalid" ? command.outcome.fields : []}
          onSubmit={(body) => void save(body)}
        />
      )}
    </Dialog>
  );
}
