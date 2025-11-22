import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";
import en from "./locals/en";
import es from "./locals/es";

const i18n = new I18n({
  en,
  es,
});

i18n.enableFallback = true;
i18n.defaultLocale = "en";

const locales = getLocales();
const languageTag =
  Array.isArray(locales) && locales.length > 0
    ? locales[0].languageTag
    : undefined;
const baseTag = languageTag ? languageTag.split("-")[0] : undefined;
const available = ["en", "es"];

if (languageTag && available.includes(languageTag)) {
  i18n.locale = languageTag;
} else if (baseTag && available.includes(baseTag)) {
  i18n.locale = baseTag;
} else {
  i18n.locale = i18n.defaultLocale;
}

export default i18n;
