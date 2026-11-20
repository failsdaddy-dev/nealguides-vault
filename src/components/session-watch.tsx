"use client";

// Mounted once in the signed-in shell. Sends this tab to /login when the
// user signs out in another tab, or when the session has gone (expired,
// revoked, account disabled) by the time the tab is looked at again.

import { useEffect } from "react";
import { onSignOutBroadcast } from "@/lib/session-sync";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";

function leave() {
  // Full navigation (not router.push) so no signed-in page stays in memory.
  window.location.replace("/login");
}

export function SessionWatch() {
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    const sb = supabaseBrowser();

    const stopBroadcast = onSignOutBroadcast(leave);
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") leave();
    });

    // getUser() asks the Auth server, so a revoked session is caught too.
    let checking = false;
    const check = async () => {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const { data, error } = await sb.auth.getUser();
        // Leave when there is no user, unless it was just a network hiccup.
        if (!data.user && error?.name !== "AuthRetryableFetchError") leave();
      } finally {
        checking = false;
      }
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);

    return () => {
      stopBroadcast();
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  return null;
}
