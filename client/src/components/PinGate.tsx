/**
 * PinGate — wraps any content behind a 4-digit PIN screen.
 * - PIN is validated server-side against the calculator_users table
 * - Unlock state (+ user name) is stored in sessionStorage so the user
 *   doesn't re-enter the PIN on page refresh within the same browser tab.
 * - Falls back to the legacy single-PIN from config.settings.calculator_pin
 *   if no calculator_users exist yet.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Delete, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

const SESSION_KEY = "dyp_pin_unlocked";
const SESSION_NAME_KEY = "dyp_pin_user_name";
const SESSION_USER_KEY = "dyp_pin_user";

interface PinGateProps {
  /** Legacy fallback: single PIN from config.settings.calculator_pin */
  legacyPin?: string;
  children: React.ReactNode;
}

export function PinGate({ legacyPin, children }: PinGateProps) {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  });
  const [unlockedName, setUnlockedName] = useState<string>(() => {
    return sessionStorage.getItem(SESSION_NAME_KEY) ?? "";
  });
  const [showWelcome, setShowWelcome] = useState(false);

  const [entry, setEntry] = useState<string>("");
  const [shake, setShake] = useState(false);
  const [error, setError] = useState(false);
  const [validating, setValidating] = useState(false);

  const validateMutation = trpc.calculatorUsers.validatePin.useMutation();

  const handleUnlock = useCallback((name: string, userObj?: object | null) => {
    sessionStorage.setItem(SESSION_KEY, "1");
    sessionStorage.setItem(SESSION_NAME_KEY, name);
    if (userObj) sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(userObj));
    setUnlockedName(name);
    setShowWelcome(true);
    setTimeout(() => {
      setShowWelcome(false);
      setUnlocked(true);
    }, 1400);
  }, []);

  const handleKey = useCallback(
    async (digit: string) => {
      if (entry.length >= 4 || validating) return;
      const next = entry + digit;
      setEntry(next);
      setError(false);

      if (next.length === 4) {
        setValidating(true);
        try {
          // First try server-side user PIN validation
          const result = await validateMutation.mutateAsync({ pin: next });
          if (result.valid) {
            handleUnlock(result.user?.name ?? "", result.user);
            return;
          }
          // Fallback: check legacy single PIN
          if (legacyPin && next === legacyPin.trim()) {
            handleUnlock("");
            return;
          }
          // Wrong PIN
          setShake(true);
          setError(true);
          setTimeout(() => {
            setShake(false);
            setEntry("");
          }, 600);
        } catch {
          // Network error — try legacy PIN as last resort
          if (legacyPin && next === legacyPin.trim()) {
            handleUnlock("");
            return;
          }
          setShake(true);
          setError(true);
          setTimeout(() => {
            setShake(false);
            setEntry("");
          }, 600);
        } finally {
          setValidating(false);
        }
      }
    },
    [entry, validating, legacyPin, validateMutation, handleUnlock]
  );

  const handleDelete = useCallback(() => {
    if (validating) return;
    setEntry((prev) => prev.slice(0, -1));
    setError(false);
  }, [validating]);

  if (unlocked) return <>{children}</>;

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="min-h-screen bg-warm-cream flex flex-col items-center justify-center px-4">
      {/* Logo / brand */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-canyon flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-display font-bold text-charcoal">Design Your Price</h1>
        <p className="text-muted-foreground font-body text-sm mt-1">Enter your PIN to access the cost estimator</p>
      </div>

      {/* Welcome flash */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-warm-cream z-50"
          >
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-display font-bold text-charcoal">
              {unlockedName ? `Welcome, ${unlockedName.split(" ")[0]}!` : "Access Granted"}
            </h2>
            <p className="text-muted-foreground font-body text-sm mt-1">Loading your estimator…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PIN dots */}
      <motion.div
        animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex gap-4 mb-8"
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "w-4 h-4 rounded-full border-2 transition-all duration-150",
              i < entry.length
                ? error
                  ? "bg-red-500 border-red-500"
                  : validating
                  ? "bg-amber-400 border-amber-400 animate-pulse"
                  : "bg-canyon border-canyon"
                : "bg-transparent border-stone-medium"
            )}
          />
        ))}
      </motion.div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            key="err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-red-500 text-sm font-body mb-4 -mt-4"
          >
            Incorrect PIN. Please try again.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {keys.map((k, idx) => {
          if (k === "") {
            return <div key={idx} />;
          }
          if (k === "del") {
            return (
              <button
                key={idx}
                onClick={handleDelete}
                disabled={entry.length === 0 || validating}
                className={cn(
                  "h-16 rounded-xl flex items-center justify-center text-charcoal transition-all duration-150 active:scale-95",
                  "bg-sandstone border border-border hover:bg-stone-light disabled:opacity-30"
                )}
              >
                <Delete className="w-5 h-5" />
              </button>
            );
          }
          return (
            <button
              key={idx}
              onClick={() => handleKey(k)}
              disabled={validating}
              className={cn(
                "h-16 rounded-xl flex items-center justify-center text-2xl font-display font-semibold text-charcoal",
                "bg-white border border-border shadow-sm hover:bg-sandstone hover:border-canyon/40 transition-all duration-150 active:scale-95",
                validating && "opacity-60 cursor-not-allowed"
              )}
            >
              {k}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground font-body mt-8">
        Contact us at{" "}
        <a href="tel:8017628267" className="text-canyon underline">
          801-762-8267
        </a>{" "}
        if you need access.
      </p>
    </div>
  );
}
