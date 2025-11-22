import i18n from "@shared/utils/translations/i18n";
import { TranslateOptions } from "i18n-js";
import { useCallback } from "react";

export const useTranslation = () => {
  const translate = useCallback(
    (key: string, config?: TranslateOptions): string => i18n.t(key, config),
    []
  );
  return translate;
};

export const useGetCurrentLanguage = () => {
  const translate = useTranslation();
  return translate("language");
};

export const useGetCurrentFullLanguage = () => {
  const translate = useTranslation();
  return translate("fullLanguage");
};

export const useI18n = () => i18n;
