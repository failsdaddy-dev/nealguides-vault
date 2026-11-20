"use client";

// Sign-out on all tabs.
//
// Supabase keeps the session in cookies shared by every tab, but an open tab
// doesn't notice when another tab signs out. Two signals cover it:
//   1. BroadcastChannel: the tab that signed out tells the others at once.
//   2. Focus / visibility check: when a tab comes back into view it re-reads
//      the session and leaves if it is gone (covers browsers without
//      BroadcastChannel and sign-outs from another device).

const CHANNEL = "ng-auth";

export function broadcastSignOut() {
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage("signed-out");
    ch.close();
  } catch {
    /* BroadcastChannel unavailable: the focus check still covers it */
  }
}

export function onSignOutBroadcast(handler: () => void): () => void {
  let ch: BroadcastChannel | null = null;
  try {
    ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (e) => {
      if (e.data === "signed-out") handler();
    };
  } catch {
    /* unavailable */
  }
  return () => ch?.close();
}
