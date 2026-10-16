import { describe, expect, it } from "vitest";
import { communityPath, isValidSlug, slugify } from "./slug";

describe("slugify", () => {
  it("transliterates umlauts and joins words with hyphens", () => {
    expect(slugify("Prompting für Alle!")).toBe("prompting-fuer-alle");
    expect(slugify("  Straße & Co.  ")).toBe("strasse-co");
    expect(slugify("Café Crème")).toBe("cafe-creme");
  });

  it("produces slugs the validator accepts", () => {
    for (const name of ["Lernwerkstatt Nord", "KI 2026", "Ä Ö Ü"]) expect(isValidSlug(slugify(name))).toBe(true);
  });
});

describe("isValidSlug", () => {
  it("rejects leading or trailing hyphens, uppercase and empty values", () => {
    expect(isValidSlug("-abc")).toBe(false);
    expect(isValidSlug("abc-")).toBe(false);
    expect(isValidSlug("Abc")).toBe(false);
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("a")).toBe(true);
  });
});

describe("communityPath", () => {
  it("prefixes paths with /c/<slug>", () => {
    expect(communityPath("acme")).toBe("/c/acme");
    expect(communityPath("acme", "/")).toBe("/c/acme");
    expect(communityPath("acme", "/admin/settings")).toBe("/c/acme/admin/settings");
  });
});
