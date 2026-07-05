export function uiText(value: string) {
  return value.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").trim();
}
