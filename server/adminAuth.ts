/**
 * PIN-based admin authentication.
 * No database lookups — the PIN is verified server-side and a signed JWT
 * session cookie is issued. The admin_users table is no longer used.
 */
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { ADMIN_COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ENV } from "./_core/env";

const getSecret = () => new TextEncoder().encode(ENV.cookieSecret);

export type AdminSessionPayload = {
  type: "admin";
  role: "admin";
};

/**
 * Verify the submitted PIN against the configured ADMIN_PIN env var.
 */
export function verifyAdminPin(pin: string): boolean {
  const expectedPin = ENV.adminPin || "3694";
  return pin === expectedPin;
}

/**
 * Create a signed JWT for a PIN-authenticated admin session.
 */
export async function createAdminSessionToken(): Promise<string> {
  const issuedAt = Date.now();
  const expirationSeconds = Math.floor((issuedAt + ONE_YEAR_MS) / 1000);
  return new SignJWT({ type: "admin", role: "admin" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSecret());
}

/**
 * Verify an admin session JWT from a cookie value.
 */
export async function verifyAdminSession(
  cookieValue: string | undefined | null
): Promise<AdminSessionPayload | null> {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, getSecret(), {
      algorithms: ["HS256"],
    });
    const { type, role } = payload as Record<string, unknown>;
    if (type !== "admin" || role !== "admin") return null;
    return { type: "admin", role: "admin" };
  } catch {
    return null;
  }
}

/**
 * Extract and verify the admin session from request cookies.
 * Returns a minimal admin user shape compatible with the context User type.
 */
export async function getAdminFromRequest(req: Request) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = parseCookieHeader(cookieHeader);
  const adminToken = cookies[ADMIN_COOKIE_NAME];
  if (!adminToken) return null;
  const session = await verifyAdminSession(adminToken);
  if (!session) return null;
  // Return a minimal admin shape — no DB lookup needed
  return {
    id: 0,
    email: "admin@designyourprice.com",
    name: "Admin",
    role: "admin" as const,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    lastSignedIn: new Date(),
  };
}
