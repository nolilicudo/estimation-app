/**
 * useCalcUser — reads the logged-in calculator user from sessionStorage.
 * Populated by PinGate when the user enters their PIN.
 */

const SESSION_USER_KEY = "dyp_pin_user";
const SESSION_NAME_KEY = "dyp_pin_user_name";

export interface CalcUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  companyPhone: string | null;
  role: "super_admin" | "manager" | "rep";
  managerId: number | null;
  permissions: Record<string, boolean>;
}

export function useCalcUser(): CalcUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CalcUser;
  } catch {
    return null;
  }
}

export function getCalcUserName(): string {
  return sessionStorage.getItem(SESSION_NAME_KEY) ?? "";
}
