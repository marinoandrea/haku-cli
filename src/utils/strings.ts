export const camelize = (s: string) =>
  s.replace(/-./g, x => x[1].toUpperCase());

export const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

export function makeHumanReadableControllerName(s: string): string {
  return capitalize(
    camelize(
      s
        .replace(new RegExp('{', 'g'), 'by-')
        .replace(new RegExp('}', 'g'), '')
        .replace(new RegExp('/', 'g'), '-')
    )
  );
}
