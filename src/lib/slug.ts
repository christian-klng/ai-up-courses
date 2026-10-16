/** Lowercase ASCII slug: "Prompting für Alle!" → "prompting-fuer-alle". */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

/** Path inside a community: communityPath("acme", "/admin") → "/c/acme/admin". */
export function communityPath(slug: string, path = ""): string {
  return `/c/${slug}${path === "/" ? "" : path}`;
}
