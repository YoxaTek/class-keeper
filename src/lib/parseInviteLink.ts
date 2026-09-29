// Recognizes this app's own invite (/invite/<token>) and class-join
// (/join/<courseId>) links — from a full pasted URL or just the bare
// path/token — shared by the QR scanner and the manual paste-a-link entry
// form, so both recognize the exact same shapes.
export function parseInviteLink(raw: string, origin: string): { param: "token" | "course"; value: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let path = trimmed;
  try {
    path = new URL(trimmed, origin).pathname;
  } catch {
    // Not a full URL — treat the trimmed input as a path/token directly.
  }

  const inviteMatch = path.match(/\/invite\/([^/?#]+)/);
  if (inviteMatch) return { param: "token", value: inviteMatch[1] };

  const joinMatch = path.match(/\/join\/([^/?#]+)/);
  if (joinMatch) return { param: "course", value: joinMatch[1] };

  return null;
}

// Where a signed-out visitor who just decoded/pasted an invite or join
// link should go to sign in — straight to /login with a callback back to
// the matching /invites step, not the /invite or /join landing page's own
// sign-in-or-sign-up chooser (redundant once you're already on/near
// /login, which links to signup itself).
export function buildInvitesLoginRedirect(param: "token" | "course", value: string): string {
  const target = `/invites?${param}=${encodeURIComponent(value)}`;
  return `/login?callbackUrl=${encodeURIComponent(target)}`;
}
