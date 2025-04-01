export function removeTags(text: string, tag: string): string {
  const openTag = `<${tag}>`;
  const closeTag = `</${tag}>`;

  // If text starts with open tag or <
  if (text.startsWith(openTag)) {
    const closeTagIndex = text.indexOf(closeTag);

    if (closeTagIndex === -1) {
      return ''; // No close tag found, return empty string
    }

    return text.substring(closeTagIndex + closeTag.length);
  }

  // If text starts with open tag or <
  const openTagIndex = text.indexOf(openTag);

  if (openTagIndex === -1) {
      return text;
  }

  return text.substring(0, openTagIndex);
}


export function compareResponsesAndGetResult(fullPermanentResponse: string): string {
  const fullPermanentResponseAfterCleaning = removeTags(fullPermanentResponse, 'working_memory'); //видаляємо теги

  return fullPermanentResponseAfterCleaning.length !== fullPermanentResponse.length ? fullPermanentResponseAfterCleaning : fullPermanentResponse
}