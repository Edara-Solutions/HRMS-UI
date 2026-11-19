import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { platformPlanOperations as operations } from "@/shared/api";
import { SchemaForm } from "@/shared/ui/schema-form";
import type { CatalogueFilters } from "../api/catalogue";

interface Props {
  search: CatalogueFilters;
}
export function CatalogueFilterForm({ search }: Props) {
  const { t } = useTranslation("platform-plans");
  const navigate = useNavigate();
  const schema = z.preprocess((body) => {
    if (typeof body !== "object" || body === null) return body;
    return {
      ...body,
      ...("isActive" in body ? { isActive: body.isActive === "true" } : {}),
      ...("isPublic" in body ? { isPublic: body.isPublic === "true" } : {}),
    };
  }, operations.plans.requestSchema.shape.query);
  return (
    <SchemaForm
      key={JSON.stringify(search)}
      schema={schema}
      label={t("filter")}
      invalidLabel={t("invalid")}
      onSubmit={(body) =>
        void navigate({
          to: "/platform/plans",
          search: operations.plans.requestSchema.shape.query.parse(body),
        })
      }
      fields={[
        { name: "name", label: t("search"), value: search.name ?? "" },
        {
          name: "isPublic",
          label: t("visibility"),
          value: search.isPublic === undefined ? "" : String(search.isPublic),
          options: [
            { value: "true", label: t("public") },
            { value: "false", label: t("private") },
          ],
        },
        {
          name: "isActive",
          label: t("status"),
          value: search.isActive === undefined ? "" : String(search.isActive),
          options: [
            { value: "true", label: t("active") },
            { value: "false", label: t("inactive") },
          ],
        },
      ]}
    />
  );
}
