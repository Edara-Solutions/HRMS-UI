const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
const formatters = {
  en: new Intl.DateTimeFormat("en-GB", options),
  ar: new Intl.DateTimeFormat("ar-SA-u-ca-gregory", options),
};

export const formatPlanDate = (value: string, language: string) =>
  (language === "ar" ? formatters.ar : formatters.en).format(new Date(value));
