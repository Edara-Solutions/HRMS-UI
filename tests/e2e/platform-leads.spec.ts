import { expect, type Page, type Route, test } from "@playwright/test";
import ar from "../../public/locales/ar/platform-leads.json" with { type: "json" };
import en from "../../public/locales/en/platform-leads.json" with { type: "json" };
import { companySessionFixture, platformSessionFixture } from "../../src/test/audience-fixtures";
import { problemBody } from "../../src/test/operation-fakes";
import {
  activityBody,
  approvedBody,
  contactBody,
  conversionBody,
  deliveryBody,
  domainBody,
  eligibilityBody,
  leadBody,
  leadDetailBody,
  leadIds,
  leadListBody,
  leadPermissions,
  pageMeta,
  plansBody,
} from "../../src/test/platform-lead-fixtures";

interface Call {
  path: string;
  method: string;
  authorization: string | null;
  body: unknown;
  page: string | null;
}
async function open(
  page: Page,
  arabic: boolean,
  overrides: Record<string, (route: Route) => Promise<void>> = {},
  permissions = leadPermissions,
  crossed = false,
) {
  const session = platformSessionFixture({ permissions });
  const company = companySessionFixture();
  const narrow = arabic !== crossed;
  await page.setViewportSize(narrow ? { width: 390, height: 844 } : { width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(
    ({ session, company, arabic, narrow }) => {
      for (const [audience, identity] of [
        ["platform", session],
        ["company", company],
      ] as const)
        localStorage.setItem(
          `hrms-${audience}-session:v1`,
          JSON.stringify({
            version: 1,
            state: {
              audience,
              generation: `${audience}-generation`,
              eventKind: "replacement",
              session: identity,
            },
          }),
        );
      localStorage.setItem(
        "hrms-preferences:v2",
        JSON.stringify({
          version: 2,
          state: { locale: arabic ? "ar" : "en", theme: narrow ? "dark" : "light", scopes: {} },
        }),
      );
    },
    { session, company, arabic, narrow },
  );
  const calls: Call[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const key = `${method} ${path}`;
    calls.push({
      path,
      method,
      authorization: request.headers().authorization ?? null,
      body: request.postData() ? JSON.parse(request.postData() ?? "") : undefined,
      page: url.searchParams.get("page"),
    });
    if (overrides[key]) return overrides[key](route);
    if (path === "/api/v1/platform/me") return route.fulfill({ json: session.user });
    if (path === "/api/v1/platform/plans") return route.fulfill({ json: plansBody() });
    if (path === "/api/v1/platform/leads")
      return route.fulfill({
        status: method === "POST" ? 201 : 200,
        json:
          method === "POST"
            ? { lead: leadBody(), contacts: [contactBody()], meta: { duplicate: false } }
            : leadListBody(),
      });
    const lead = `/api/v1/platform/leads/${leadIds.lead}`;
    const conversion = `/api/v1/platform/lead-conversion-requests/${leadIds.request}`;
    if (path === lead)
      return method === "DELETE"
        ? route.fulfill({ status: 204 })
        : route.fulfill({
            json:
              method === "PATCH"
                ? { lead: leadBody(), contacts: [contactBody()] }
                : leadDetailBody(),
          });
    if (path === `${lead}/conversion-eligibility`)
      return route.fulfill({ json: eligibilityBody() });
    if (path === `${lead}/activities`)
      return route.fulfill({
        status: method === "POST" ? 201 : 200,
        json: method === "POST" ? activityBody() : { items: [activityBody()], meta: pageMeta() },
      });
    if (path === `${lead}/contacts`) return route.fulfill({ status: 201, json: contactBody() });
    if (path === `${lead}/contacts/${leadIds.contact}`)
      return method === "DELETE"
        ? route.fulfill({ status: 204 })
        : route.fulfill({ json: contactBody() });
    if (path === `${lead}/activities/${leadIds.activity}`) return route.fulfill({ status: 204 });
    if ([`${lead}/archive`, `${lead}/unarchive`].includes(path))
      return route.fulfill({ json: { lead: leadBody(), contacts: [contactBody()] } });
    if (path === `${lead}/sending-domain/readiness`)
      return route.fulfill({ json: { ready: false, reason: "NOT_VERIFIED" } });
    if ([`${lead}/sending-domain`, `${lead}/sending-domain/verify`].includes(path))
      return route.fulfill({ json: domainBody() });
    if (path === "/api/v1/platform/lead-conversion-requests")
      return route.fulfill({
        status: method === "POST" ? 201 : 200,
        json:
          method === "POST" ? conversionBody() : { items: [conversionBody()], meta: pageMeta() },
      });
    if (path === "/api/v1/platform/lead-conversion-requests/immediate")
      return route.fulfill({ json: approvedBody() });
    if (path === conversion) return route.fulfill({ json: conversionBody() });
    if ([`${conversion}/approve`, `${conversion}/reject`, `${conversion}/plan`].includes(path))
      return route.fulfill({ json: path.endsWith("approve") ? approvedBody() : conversionBody() });
    if (path === `${conversion}/onboarding-delivery`)
      return route.fulfill({ json: deliveryBody() });
    if (path === `${conversion}/onboarding-delivery/retry`)
      return route.fulfill({ json: deliveryBody({ status: "PENDING" }) });
    return route.fulfill({ status: 404, json: problemBody(404) });
  });
  return { calls, company };
}
test("lead modals use country and regional selectors with modal keyboard behavior", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { calls } = await open(page, arabic);
  const locationData = "https://venkatvidyut.github.io/react-country-state-city/data";
  await page.route(`${locationData}/countriesminified.json`, (route) =>
    route.fulfill({
      json: [
        { id: 65, name: "Egypt" },
        { id: 233, name: "United States" },
      ],
    }),
  );
  await page.route(`${locationData}/statesminified.json`, (route) =>
    route.fulfill({
      json: [
        { id: 65, states: [{ id: 3235, name: "Cairo Governorate" }] },
        { id: 233, states: [{ id: 1456, name: "California" }] },
      ],
    }),
  );
  await page.goto("/platform/leads");
  await page.getByRole("button", { name: copy.create, exact: true }).click();
  const create = page.getByRole("dialog", { name: copy.create });
  const country = create.getByRole("combobox", { name: copy["field.country"], exact: true });
  const state = create.getByRole("combobox", { name: copy["location.state"], exact: true });
  await expect(state).toBeDisabled();
  await country.click();
  await page.getByRole("textbox", { name: copy["location.searchCountries"] }).fill("Egypt");
  await page.keyboard.press("Escape");
  await expect(country).toHaveAttribute("aria-expanded", "false");
  await expect(create).toBeVisible();
  await country.click();
  await page.getByRole("option", { name: "Egypt", exact: true }).click();
  await state.click();
  await page.getByRole("option", { name: "Cairo Governorate", exact: true }).click();
  await create.getByLabel(copy["contact.name"], { exact: true }).fill("Owner");
  await create.getByRole("button", { name: copy.create, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/platform/leads/${leadIds.lead}`));
  await page.getByRole("button", { name: copy["detail.edit"], exact: true }).click();
  const edit = page.getByRole("dialog", { name: copy["detail.edit"] });
  const editCountry = edit.getByRole("combobox", { name: copy["field.country"], exact: true });
  const editState = edit.getByRole("combobox", { name: copy["location.state"], exact: true });
  await expect(editState).toHaveText("Cairo");
  await editCountry.click();
  await page.getByRole("option", { name: "United States", exact: true }).click();
  await editState.click();
  await page.getByRole("option", { name: "California", exact: true }).click();
  await edit.getByRole("button", { name: copy.save, exact: true }).click();
  await expect(edit).toHaveCount(0);
  expect(calls.find(({ method }) => method === "POST")?.body).toMatchObject({
    country: "Egypt",
    city: "Cairo Governorate",
  });
  expect(calls.find(({ method }) => method === "PATCH")?.body).toEqual({
    country: "United States",
    city: "California",
  });
});

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}
for (const crossed of [false, true])
  test(`CRM registry and detail locale/theme/viewport${crossed ? " crossed" : ""}`, async ({
    page,
  }, info) => {
    const arabic = info.project.name === "chromium-rtl";
    const copy = arabic ? ar : en;
    const { calls, company } = await open(
      page,
      arabic,
      {
        [`GET /api/v1/platform/leads/${leadIds.lead}/activities`]: async (route) =>
          route.fulfill({
            json: {
              items: [
                activityBody(),
                activityBody({
                  publicId: leadIds.other,
                  type: "SYSTEM_EVENT",
                  note: "Status changed: QUALIFIED -> NEGOTIATION",
                }),
              ],
              meta: { ...pageMeta(), totalItems: 2 },
            },
          }),
      },
      leadPermissions,
      crossed,
    );
    await page.goto("/platform/leads");
    await expect(page.getByRole("link", { name: "Acme Lead" })).toBeVisible();
    await page.getByRole("combobox", { name: copy["leads.statusLabel"] }).click();
    await page.getByRole("option", { name: copy["enum.QUALIFIED"], exact: true }).click();
    await expect(page).toHaveURL(/status=QUALIFIED/);
    await page.getByRole("link", { name: "Acme Lead" }).click();
    await expect(page.getByRole("heading", { name: copy["history.title"] })).toBeVisible();
    await expect(page.getByRole("link", { name: "https://acme.example" })).toHaveAttribute(
      "href",
      "https://acme.example/",
    );
    await page.getByRole("tab", { name: copy["detail.tab.profile"] }).focus();
    await page.keyboard.press(arabic ? "ArrowLeft" : "ArrowRight");
    await expect(page.getByRole("tab", { name: copy["detail.tab.conversion"] })).toBeFocused();
    const review = page.getByRole("radio", { name: copy["conversion.reviewPath"] });
    const immediate = page.getByRole("radio", { name: copy["conversion.immediatePath"] });
    await expect(review).toBeChecked();
    await expect(
      page.getByRole("button", { name: copy["action.immediate"], exact: true }),
    ).toHaveCount(0);
    await immediate.check();
    await expect(
      page.getByRole("button", { name: copy["action.immediate"], exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: copy["action.submit"], exact: true }),
    ).toHaveCount(0);
    if (!crossed)
      await page
        .getByRole("tabpanel", { name: copy["detail.tab.conversion"] })
        .screenshot({ path: info.outputPath("conversion.png") });
    await page.getByRole("tab", { name: copy["detail.tab.domain"] }).click();
    await expect(page.getByText("verify-acme", { exact: true })).toBeVisible();
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page
      .getByRole("button", { name: copy["domain.copyField"].replace("{{field}}", copy["dns.2"]) })
      .click();
    await expect(
      page.getByText(copy["domain.copied"].replace("{{field}}", copy["dns.2"])),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("verify-acme");
    await page.getByRole("tab", { name: copy["detail.tab.activity"] }).click();
    await expect(page.getByText("Requested a demo", { exact: true })).toBeVisible();
    await expect(
      page.getByText(copy["activity.event.statusChanged"], { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: copy["activity.note"] })).toBeEditable();
    await expect(page.locator("html")).toHaveAttribute("dir", arabic ? "rtl" : "ltr");
    await noOverflow(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await noOverflow(page);
    const activity = page.getByRole("tabpanel", { name: copy["detail.tab.activity"] });
    const timelineWidth = await activity
      .getByRole("list")
      .evaluate((element) => element.clientWidth);
    const panelWidth = await activity.evaluate((element) => element.clientWidth);
    expect(timelineWidth).toBeGreaterThan(panelWidth / 2);
    await page.screenshot({
      path: info.outputPath(`crm-${arabic ? "ar" : "en"}-${crossed}.png`),
      fullPage: true,
    });
    expect(
      calls.every(
        (call) =>
          call.path.startsWith("/api/v1/platform/") &&
          call.authorization === "Bearer access-canary",
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("hrms-company-session:v1") ?? "{}").state.session,
      ),
    ).toEqual(company);
    await expect(page.locator("body")).not.toContainText(
      /provider-secret-canary|provider-internal-canary|dns-internal-canary/,
    );
  });
test("read-only request inspection is independent of approval and root role", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { calls } = await open(page, arabic, {}, ["lead-conversion-requests:read"]);
  await page.goto(`/platform/conversion-requests/${leadIds.request}`);
  await expect(page.getByRole("heading", { name: "Acme Lead" })).toBeVisible();
  await expect(page.getByRole("button", { name: copy["action.approve"] })).toHaveCount(0);
  await expect(page.getByText(copy.withheld, { exact: true })).toBeVisible();
  expect(calls.some((call) => call.path.endsWith("plans"))).toBe(false);
});
test("failed immediate conversion recovers the original page-two request and blocks resubmission", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { calls } = await open(page, arabic, {
    "POST /api/v1/platform/lead-conversion-requests/immediate": async (route) =>
      route.fulfill({ status: 500, json: problemBody(500) }),
    "GET /api/v1/platform/lead-conversion-requests": async (route) => {
      const number = Number(new URL(route.request().url()).searchParams.get("page"));
      await route.fulfill({
        json: { items: number === 2 ? [conversionBody()] : [], meta: pageMeta(number, 2) },
      });
    },
  });
  await page.goto(`/platform/leads/${leadIds.lead}`);
  await page.getByRole("tab", { name: copy["detail.tab.conversion"] }).click();
  await page.getByRole("radio", { name: copy["conversion.immediatePath"] }).check();
  const trigger = page.getByRole("button", { name: copy["action.immediate"], exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: copy.cancel, exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: copy["action.immediate"], exact: true }).click();
  await expect(page.getByRole("link", { name: copy["conversion.inspect"] })).toHaveAttribute(
    "href",
    `/platform/conversion-requests/${leadIds.request}`,
  );
  await expect(trigger).toHaveCount(0);
  await expect(page.getByRole("button", { name: copy["action.submit"], exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole("region", { name: copy["conversion.outcomeTitle"] })).toBeFocused();
  expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  expect(
    calls.filter((call) => call.path.endsWith("lead-conversion-requests")).map((call) => call.page),
  ).toEqual(["1", "2"]);
  await expect(page.locator("body")).not.toContainText("internal-detail-canary");
});
test("immediate conversion configures custom steps and a future trial end", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { calls } = await open(page, arabic);
  await page.goto(`/platform/leads/${leadIds.lead}`);
  await page.getByRole("tab", { name: copy["detail.tab.conversion"] }).click();
  await page.getByRole("radio", { name: copy["conversion.immediatePath"] }).check();

  const trial = page.getByRole("button", { name: copy["setup.trialEnd"] });
  await trial.click();
  const picker = page.getByRole("dialog", { name: copy["setup.trialEnd"] });
  await picker.getByRole("button", { name: arabic ? "الشهر السابق" : "Previous month" }).click();
  await picker.getByRole("grid").getByRole("button").first().click();
  await picker.getByRole("button", { name: copy["setup.applyTrialEnd"] }).click();
  await expect(picker.getByRole("alert")).toHaveText(copy["setup.trialEndInvalid"]);
  const nextMonth = picker.getByRole("button", { name: arabic ? "الشهر التالي" : "Next month" });
  await nextMonth.click();
  await nextMonth.click();
  await picker.getByRole("grid").getByRole("button").first().click();
  await picker.getByLabel(copy["setup.minute"], { exact: true }).fill("17");
  await picker.getByRole("button", { name: copy["setup.applyTrialEnd"] }).click();
  await expect(picker).toHaveCount(0);
  const expectedTrialEnd = await page.evaluate(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1, 23, 17).toISOString();
  });

  await page.getByRole("checkbox", { name: copy["setup.custom"], exact: true }).check();
  await page.getByRole("checkbox", { name: copy["enum.SET_ROLES"], exact: true }).check();
  const roles = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: copy["enum.SET_ROLES"], exact: true }) });
  await roles
    .getByRole("checkbox", { name: copy["enum.SET_COMPANY_PROFILE"], exact: true })
    .check();
  await expect(roles.getByLabel(copy["setup.sequence"])).toHaveValue("2");
  await page.getByRole("button", { name: copy["action.immediate"], exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: copy["action.immediate"], exact: true })
    .click();
  await expect(page.getByRole("link", { name: copy["conversion.inspect"] })).toBeVisible();
  expect(
    calls.find((call) => call.method === "POST" && call.path.endsWith("/immediate"))?.body,
  ).toEqual({
    leadPublicId: leadIds.lead,
    planPublicId: leadIds.plan,
    templateKey: -1,
    trialEndDate: expectedTrialEnd,
    setupSteps: [
      { stepType: "SET_COMPANY_PROFILE", isRequired: true, sequence: 1, dependencies: [] },
      {
        stepType: "SET_ROLES",
        isRequired: false,
        sequence: 2,
        dependencies: ["SET_COMPANY_PROFILE"],
      },
    ],
  });
});

test("approval custom setup and plan correction use named confirmations", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { calls } = await open(page, arabic);
  await page.goto(`/platform/conversion-requests/${leadIds.request}`);
  await page.getByRole("tab", { name: copy["requests.tab.correct"] }).click();
  await page.getByRole("button", { name: copy["action.changePlan"], exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: copy["action.changePlan"], exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: copy["requests.tab.actions"] }).click();
  await page.getByRole("checkbox", { name: copy["setup.custom"], exact: true }).check();
  await page.getByRole("button", { name: copy["action.approve"], exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: copy["action.approve"], exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const approval = calls.find((call) => call.path.endsWith("/approve"));
  expect(approval?.body).toEqual({
    templateKey: -1,
    setupSteps: [
      { stepType: "SET_COMPANY_PROFILE", isRequired: true, sequence: 1, dependencies: [] },
    ],
  });
  expect(calls.find((call) => call.path.endsWith("/plan"))?.body).toEqual({
    planPublicId: leadIds.plan,
  });
});
test("delivery retry is bound to the original provisioned owner without credentials", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { calls } = await open(page, arabic, {
    [`GET /api/v1/platform/lead-conversion-requests/${leadIds.request}`]: async (route) =>
      route.fulfill({ json: approvedBody() }),
  });
  await page.goto(`/platform/conversion-requests/${leadIds.request}`);
  const trigger = page.getByRole("button", { name: copy["action.retryDelivery"], exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: copy["action.retryDelivery"], exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const writes = calls.filter((call) => call.method === "POST");
  expect(writes).toHaveLength(1);
  expect(writes[0].body).toBeUndefined();
  expect(writes[0].path).toBe(
    `/api/v1/platform/lead-conversion-requests/${leadIds.request}/onboarding-delivery/retry`,
  );
  await expect(page.locator("body")).not.toContainText(
    /smtp-credential-canary|delivery-key-canary/,
  );
  await noOverflow(page);
});
for (const status of [400, 403, 409, 429, 500])
  test(`mutation ${status} is bounded and never automatically retried`, async ({ page }, info) => {
    const arabic = info.project.name === "chromium-rtl";
    const copy = arabic ? ar : en;
    const { calls } = await open(page, arabic, {
      [`POST /api/v1/platform/leads/${leadIds.lead}/sending-domain/verify`]: async (route) =>
        route.fulfill({ status, json: problemBody(status) }),
    });
    await page.goto(`/platform/leads/${leadIds.lead}`);
    await page.getByRole("tab", { name: copy["detail.tab.domain"] }).click();
    await page.getByRole("button", { name: copy["action.verify"], exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: copy["action.verify"], exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: copy.reconcile, exact: true })).toBeVisible();
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
    await expect(page.locator("body")).not.toContainText(
      /internal-detail-canary|internal-instance-canary/,
    );
  });
test("offline command remains uncertain and is never retried", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { calls } = await open(page, arabic, {
    [`POST /api/v1/platform/leads/${leadIds.lead}/sending-domain/verify`]: async (route) =>
      route.abort("failed"),
  });
  await page.goto(`/platform/leads/${leadIds.lead}`);
  await page.getByRole("tab", { name: copy["detail.tab.domain"] }).click();
  await page.getByRole("button", { name: copy["action.verify"], exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: copy["action.verify"], exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(copy["outcome.uncertain"], { exact: true })).toBeVisible();
  expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  await expect(
    page.getByRole("button", { name: copy["action.verify"], exact: true }),
  ).toBeDisabled();
});
test("foreign request scope conceals all actions and projected content", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  await open(page, arabic, {
    [`GET /api/v1/platform/lead-conversion-requests/${leadIds.request}`]: async (route) =>
      route.fulfill({
        json: conversionBody({
          publicId: leadIds.other,
          lead: leadBody({ companyName: "foreign-lead-canary" }),
        }),
      }),
  });
  await page.goto(`/platform/conversion-requests/${leadIds.request}`);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("foreign-lead-canary");
  const copy = arabic ? ar : en;
  await expect(page.getByRole("button", { name: copy["action.approve"], exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: copy["action.retryDelivery"], exact: true }),
  ).toHaveCount(0);
});
test("empty and loading registry states remain bounded", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  let release: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await open(page, arabic, {
    "GET /api/v1/platform/leads": async (route) => {
      await ready;
      await route.fulfill({ json: { items: [], meta: pageMeta() } });
    },
  });
  await page.goto("/platform/leads");
  await expect(page.getByRole("status")).toBeVisible();
  release();
  await expect(page.getByText(copy["leads.empty.title"], { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: copy.next, exact: true })).toBeDisabled();
});
test("contact modals save additions and edits and return focus on close", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { calls } = await open(page, arabic);
  await page.goto(`/platform/leads/${leadIds.lead}`);
  const add = page.getByRole("button", { name: copy["action.addContact"] });
  await add.click();
  const addDialog = page.getByRole("dialog", { name: copy["action.addContact"] });
  await expect(addDialog).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(addDialog).toHaveCount(0);
  await expect(add).toBeFocused();
  await add.click();
  await addDialog.getByLabel(copy["contact.name"]).fill("New contact");
  await addDialog.getByRole("button", { name: copy["action.addContact"] }).click();
  await expect(addDialog).toHaveCount(0);
  await expect(add).toBeFocused();
  const edit = page.getByRole("button", { name: copy["contact.edit"] });
  await edit.click();
  const editDialog = page.getByRole("dialog", { name: copy["contact.edit"] });
  const name = editDialog.getByLabel(copy["contact.name"]);
  await expect(name).toHaveValue("Intended Owner");
  await name.fill("Updated owner");
  await editDialog.getByRole("button", { name: copy["action.updateContact"] }).click();
  await expect(editDialog).toHaveCount(0);
  await expect(edit).toBeFocused();
  expect(
    calls.filter(({ method }) => method === "POST" || method === "PATCH").map(({ body }) => body),
  ).toEqual([{ name: "New contact", isPrimary: false }, { name: "Updated owner" }]);
});

test("typed delete confirmation supports Escape, focus return and keyboard completion", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { calls } = await open(page, arabic);
  await page.goto(`/platform/leads/${leadIds.lead}`);
  const trigger = page.getByRole("button", { name: copy["action.remove"], exact: true });
  await trigger.click();
  let dialog = page.getByRole("dialog");
  await expect(dialog).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: copy["action.remove"], exact: true });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(copy["confirm.typed"].replace("{{name}}", "Acme Lead")).fill("Acme Lead");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page).toHaveURL(/\/platform\/leads\?/);
  expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
});
