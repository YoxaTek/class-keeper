// Server-only: which OAuth login providers are actually configured. The
// login/signup pages use this to only render a provider's button when it
// will actually work — showing a button for an unconfigured provider is
// exactly how we ended up with a Google "invalid_client" error before.
export type AuthProviderId = "google" | "facebook" | "line";

export function getEnabledProviders(): AuthProviderId[] {
  const providers: AuthProviderId[] = [];
  // Google, Facebook, and Line sign-in are disabled for now — see src/lib/auth.ts.
  // if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) providers.push("google");
  // if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) providers.push("facebook");
  // if (process.env.LINE_CLIENT_ID && process.env.LINE_CLIENT_SECRET) providers.push("line");
  return providers;
}
