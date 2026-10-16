"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOperator } from "@/server/auth/session";
import { createCommunity } from "@/server/domain/communities";
import { DEFAULT_THEME } from "@/server/db/schema";
import { isValidHexColor } from "@/lib/theme";
import { SLUG_PATTERN } from "@/lib/slug";

export type CreateCommunityState = { status: "idle" } | { status: "created"; name: string } | { status: "error"; code: "invalid" | "slugTaken" };

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN),
  adminEmail: z.string().trim().toLowerCase().email(),
  adminName: z.string().trim().min(2).max(120),
  primaryColor: z.string().refine(isValidHexColor),
  locale: z.enum(["de", "en"]),
});

/** Operator only: a new community with its first admin (PLAN.md §3.2 – no self-service yet). */
export async function createCommunityAction(_prev: CreateCommunityState, formData: FormData): Promise<CreateCommunityState> {
  const operator = await assertOperator();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", code: "invalid" };
  const { primaryColor, ...input } = parsed.data;
  const res = await createCommunity({ ...input, theme: { ...DEFAULT_THEME, primaryColor: primaryColor.toLowerCase() } }, operator.id);
  if (!res.ok) return { status: "error", code: "slugTaken" };
  revalidatePath("/operator");
  return { status: "created", name: res.community.name };
}
