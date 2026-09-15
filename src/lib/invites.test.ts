import { describe, expect, it } from "vitest";
import { validateInvite } from "./invites";

const now = new Date("2026-09-15T00:00:00Z");

describe("validateInvite", () => {
  it("rejects a missing invite", () => {
    expect(validateInvite(null, "a@example.com", now)).toEqual({ ok: false, reason: "not_found" });
  });

  it("rejects an already-accepted invite", () => {
    const invite = { email: null, expiresAt: null, acceptedAt: new Date("2026-01-01") };
    expect(validateInvite(invite, "a@example.com", now)).toEqual({ ok: false, reason: "already_accepted" });
  });

  it("rejects an expired invite", () => {
    const invite = { email: null, expiresAt: new Date("2026-01-01"), acceptedAt: null };
    expect(validateInvite(invite, "a@example.com", now)).toEqual({ ok: false, reason: "expired" });
  });

  it("accepts an invite that expires in the future", () => {
    const invite = { email: null, expiresAt: new Date("2027-01-01"), acceptedAt: null };
    expect(validateInvite(invite, "a@example.com", now)).toEqual({ ok: true });
  });

  it("rejects a mismatched email, case-insensitively matching the happy path", () => {
    const invite = { email: "Teacher@Example.com", expiresAt: null, acceptedAt: null };
    expect(validateInvite(invite, "someone-else@example.com", now)).toEqual({
      ok: false,
      reason: "email_mismatch",
    });
    expect(validateInvite(invite, "teacher@example.com", now)).toEqual({ ok: true });
  });

  it("accepts an invite with no email restriction from any accepting email", () => {
    const invite = { email: null, expiresAt: null, acceptedAt: null };
    expect(validateInvite(invite, "anyone@example.com", now)).toEqual({ ok: true });
  });
});
