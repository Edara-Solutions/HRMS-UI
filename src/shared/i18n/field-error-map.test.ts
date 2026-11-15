import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fieldErrorMap, fieldErrors, passwordRuleHint } from "./field-error-map";

const translate = (key: string, values?: { count?: number }) =>
  values?.count === undefined ? key : `${key}=${values.count}`;

const messagesFor = (schema: z.ZodTypeAny, input: unknown) => {
  const parsed = schema.safeParse(input, { errorMap: fieldErrorMap(translate) });
  return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
};

describe("fieldErrorMap", () => {
  it("names a missing value as required", () => {
    expect(messagesFor(z.string().min(1), "")).toEqual(["auth:journey.fieldRequired"]);
  });

  it("names the bound a value misses", () => {
    expect(messagesFor(z.string().min(8), "short")).toEqual(["auth:journey.fieldTooShort=8"]);
    expect(messagesFor(z.string().max(3), "toolong")).toEqual(["auth:journey.fieldTooLong=3"]);
  });

  it("names malformed emails and web addresses", () => {
    expect(messagesFor(z.string().email(), "nope")).toEqual(["auth:journey.fieldEmail"]);
    expect(messagesFor(z.string().url(), "nope")).toEqual(["auth:journey.fieldUrl"]);
  });

  it("keeps a refinement's own message", () => {
    const schema = z.string().refine(() => false, { message: "journey.passwordMismatch" });
    expect(messagesFor(schema, "x")).toEqual(["journey.passwordMismatch"]);
  });

  it("keeps the first message per visible field", () => {
    const schema = z.object({ a: z.string().min(1).email(), hidden: z.string().min(1) });
    const parsed = schema.safeParse({ a: "", hidden: "" }, { errorMap: fieldErrorMap(translate) });
    expect(parsed.success ? {} : fieldErrors(parsed.error.issues, new Set(["a"]))).toEqual({
      a: "auth:journey.fieldRequired",
    });
  });

  it("names missing password character types only for the new password", () => {
    const schema = z.object({ newPassword: z.string().regex(/\d/), code: z.string().regex(/\d/) });
    const parsed = schema.safeParse(
      { newPassword: "x", code: "x" },
      { errorMap: fieldErrorMap(translate) },
    );
    expect(parsed.success ? [] : parsed.error.issues.map((issue) => issue.message)).toEqual([
      "auth:journey.fieldPasswordCharacters",
      "auth:journey.invalidField",
    ]);
  });

  it("states the password rule from the schema's minimum length", () => {
    const schema = z.object({ newPassword: z.string().min(12).max(128), email: z.string() });
    expect(passwordRuleHint(translate, schema, "newPassword")).toBe("auth:journey.passwordRule=12");
    expect(passwordRuleHint(translate, schema, "email")).toBeNull();
    expect(
      passwordRuleHint(
        translate,
        z.object({ currentPassword: z.string().min(1) }),
        "currentPassword",
      ),
    ).toBeNull();
    expect(passwordRuleHint(translate, undefined, "newPassword")).toBeNull();
  });

  it("falls back to a generic message for anything else", () => {
    expect(messagesFor(z.enum(["a"]), "b")).toEqual(["auth:journey.invalidField"]);
  });
});
