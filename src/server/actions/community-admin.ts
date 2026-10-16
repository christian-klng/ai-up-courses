"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertCommunityAdmin } from "@/server/auth/session";
import { setMemberRole, setMemberStatus, updateCommunitySettings } from "@/server/domain/communities";
import { setCommunityInviteEnabled, type InviteWithUrl } from "@/server/domain/community-invites";
import { isValidHexColor } from "@/lib/theme";
import { communityPath } from "@/lib/slug";

export type SettingsFormState = { status: "idle" } | { status: "saved" } | { status: "error"; field?: "name" | "color" };

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(160),
  defaultLocale: z.enum(["de", "en"]),
  primaryColor: z.string().refine(isValidHexColor),
  radius: z.coerce.number().min(0).max(1.5),
  mode: z.enum(["light", "dark", "system"]),
});

/** Name, tagline, language and branding of a community – admins only. */
export async function saveCommunitySettingsAction(communityId: string, _prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const { community } = await assertCommunityAdmin(communityId);
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { status: "error", field: field === "primaryColor" ? "color" : field === "name" ? "name" : undefined };
  }
  const { name, tagline, defaultLocale, primaryColor, radius, mode } = parsed.data;
  await updateCommunitySettings(communityId, {
    name,
    tagline: tagline || null,
    defaultLocale,
    theme: { primaryColor: primaryColor.toLowerCase(), radius, mode },
  });
  // The theme lives in the root layout, so every layout of the community has to render again.
  revalidatePath(communityPath(community.slug), "layout");
  return { status: "saved" };
}

export async function setJoinLinkEnabledAction(communityId: string, enabled: boolean): Promise<InviteWithUrl> {
  const { user } = await assertCommunityAdmin(communityId);
  return setCommunityInviteEnabled(communityId, enabled, user.id);
}

export type MemberActionResult = { ok: true } | { ok: false; reason: "not_found" | "last_admin" };

export async function setMemberRoleAction(communityId: string, userId: string, role: "admin" | "member"): Promise<MemberActionResult> {
  const { user, community } = await assertCommunityAdmin(communityId);
  const res = await setMemberRole(communityId, userId, role, user.id);
  revalidatePath(communityPath(community.slug), "layout");
  return res;
}

export async function setMemberStatusAction(communityId: string, userId: string, status: "active" | "suspended"): Promise<MemberActionResult> {
  const { user, community } = await assertCommunityAdmin(communityId);
  const res = await setMemberStatus(communityId, userId, status, user.id);
  revalidatePath(communityPath(community.slug), "layout");
  return res;
}
