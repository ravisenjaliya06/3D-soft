export function safeNameIncludes(
  name: string | undefined | null,
  searchString: string,
): boolean {
  return typeof name === 'string' && name.includes(searchString);
}
