import { describe, expect, it } from "vitest";
import { isProductionEnvironment } from "./env";

describe("isProductionEnvironment", () => {
  it("is false for a plain dev environment", () => {
    expect(isProductionEnvironment({ NODE_ENV: "development" })).toBe(false);
  });

  it("is true when NODE_ENV is production", () => {
    expect(isProductionEnvironment({ NODE_ENV: "production" })).toBe(true);
  });

  it("is true when VERCEL_ENV is production, regardless of NODE_ENV", () => {
    expect(
      isProductionEnvironment({ NODE_ENV: "production", VERCEL_ENV: "production" })
    ).toBe(true);
    expect(isProductionEnvironment({ VERCEL_ENV: "preview" })).toBe(false);
  });

  it("is true when DATABASE_URL matches the configured production host marker", () => {
    const env = {
      DATABASE_URL: "postgresql://user:pw@ep-prod-main-123.neon.tech/class_keeper",
      PRODUCTION_DB_HOST_MARKER: "ep-prod-main-123",
    };
    expect(isProductionEnvironment(env)).toBe(true);
  });

  it("ignores the marker check when no marker is configured", () => {
    const env = { DATABASE_URL: "postgresql://user:pw@ep-prod-main-123.neon.tech/class_keeper" };
    expect(isProductionEnvironment(env)).toBe(false);
  });
});
