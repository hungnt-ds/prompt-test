import type { IpaCategory } from "@/data/ipa";

/** Màu nhấn theo nhóm âm — dùng chung cho SoundCard và các trang IPA. */
export const CATEGORY_ACCENT: Record<IpaCategory, string> = {
  consonant: "text-sky-700 dark:text-sky-300",
  monophthong: "text-amber-700 dark:text-amber-300",
  diphthong: "text-fuchsia-700 dark:text-fuchsia-300",
};
