"use client";

import { useEffect } from "react";
import { claimReferral } from "@kmo/shared/api";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "@/lib/supabase";

const KEY = "kmo-ref";

/** Remembers a friend's code from a ?ref= link and applies it once the
 *  visitor is signed in as a real (non-guest) customer. Invalid or not
 *  eligible codes are simply dropped. */
export function ReferralCapture() {
  const { user, profile } = useAuth();

  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^[A-Za-z0-9]{6,12}$/.test(ref)) localStorage.setItem(KEY, ref.toUpperCase());
    } catch {
      // storage blocked: the code can still be typed on the points page
    }
  }, []);

  useEffect(() => {
    if (!user || user.is_anonymous || profile?.role !== "customer") return;
    let code: string | null = null;
    try {
      code = localStorage.getItem(KEY);
    } catch {
      return;
    }
    if (!code) return;
    claimReferral(supabase, code)
      .catch(() => undefined)
      .finally(() => {
        try {
          localStorage.removeItem(KEY);
        } catch {
          // ignore
        }
      });
  }, [user, profile?.role]);

  return null;
}
