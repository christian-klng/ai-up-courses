import { brandInitials, mailBrandColors } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Monogram of the community (or the app). Without `color` it wears the current theme's primary;
 * lists of several communities pass each one's own color. Logos come later with uploads.
 */
export function BrandLogo({ name, size = 32, color }: { name: string; size?: number; color?: string }) {
  const own = color ? mailBrandColors(color) : undefined;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-md font-semibold", !own && "bg-primary text-primary-foreground")}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), ...(own ? { background: own.color, color: own.foreground } : {}) }}
      aria-hidden
    >
      {brandInitials(name)}
    </span>
  );
}
