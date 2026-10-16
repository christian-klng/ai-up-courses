import { getAccount } from "@/server/auth/session";
import { joinViaCommunityInvite } from "@/server/domain/community-invites";
import { communityPath } from "@/lib/slug";

/**
 * Landing point of the magic link sent from the join form: the click proved the address, so this is
 * where the membership is created. Answers with relative redirects (the request URL may carry the
 * internal host behind the proxy).
 */
export async function GET(_request: Request, { params }: RouteContext<"/join/[token]/accept">) {
  const { token } = await params;
  const account = await getAccount();
  if (!account) return redirectTo(`/login?next=${encodeURIComponent(`/join/${token}`)}`);
  const res = await joinViaCommunityInvite(token, account.id);
  return redirectTo(res.ok ? communityPath(res.community.slug) : `/join/${token}`);
}

function redirectTo(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location } });
}
