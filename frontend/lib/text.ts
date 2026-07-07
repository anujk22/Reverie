export function uiText(value: string) {
  return value.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").trim();
}

const labelAcronyms = new Set(["ai", "api", "id", "json", "kr", "llm", "ui", "ux"]);
const labelSmallWords = new Set([
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "vs",
  "with"
]);

function titleWord(value: string, index: number) {
  const lower = value.toLowerCase();
  if (labelAcronyms.has(lower)) return lower.toUpperCase();
  if (index > 0 && labelSmallWords.has(lower)) return lower;
  return `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`;
}

export function labelText(value: string) {
  return value
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/)
    .map((word, index) =>
      word
        .split("-")
        .map((part) => titleWord(part, index))
        .join("-")
    )
    .join(" ");
}
