import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getAdminFromRequest } from "../adminAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // First, try custom admin auth (email/password session)
  try {
    const adminUser = await getAdminFromRequest(opts.req);
    if (adminUser) {
      // Map admin_users row to a User-compatible shape for the context
      user = {
        id: adminUser.id,
        openId: `admin-${adminUser.id}`,
        name: adminUser.name || adminUser.email,
        email: adminUser.email,
        loginMethod: "email",
        role: "admin",
        createdAt: adminUser.createdAt,
        updatedAt: adminUser.updatedAt,
        lastSignedIn: adminUser.lastSignedIn || new Date(),
      };
    }
  } catch (error) {
    // Admin auth failed, continue to Manus OAuth
  }

  // Fall back to Manus OAuth if no admin session
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
