import { useEffect, useState } from "react";
import { deletePushSubscription, savePushSubscription } from "@kmo/shared/api";
import { supabase } from "../lib/supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64Safe);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

type Status = "unsupported" | "checking" | "off" | "on" | "blocked";

export function OrderPushNotificationsCard() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function refreshStatus() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("blocked");
      return;
    }
    const registration = await navigator.serviceWorker.getRegistration();
    const sub = await registration?.pushManager.getSubscription();
    setStatus(sub ? "on" : "off");
  }

  async function enable() {
    if (!VAPID_PUBLIC_KEY) {
      setError("Notifications aren't configured yet.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
      const key = sub.getKey("p256dh");
      const authSecret = sub.getKey("auth");
      if (!key || !authSecret) throw new Error("Couldn't read subscription keys");
      await savePushSubscription(supabase, {
        endpoint: sub.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
        auth: btoa(String.fromCharCode(...new Uint8Array(authSecret))),
      });
      setStatus("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't enable notifications");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const sub = await registration?.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(supabase, sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't disable notifications");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
      <p className="text-[15px] font-bold text-ink">Order notifications on this device</p>
      <p className="text-xs text-muted">
        Turn this on to get a push notification on this phone/browser the moment a new order comes in — even if
        the admin dashboard isn&rsquo;t open. This is per-device: turn it on separately on each phone/browser you
        want to be notified on.
      </p>
      {status === "unsupported" ? (
        <p className="text-[12.5px] font-semibold text-muted">
          This browser doesn&rsquo;t support push notifications. Try Chrome, or add this site to your home screen
          first on iPhone.
        </p>
      ) : status === "blocked" ? (
        <p className="text-[12.5px] font-semibold text-danger">
          Notifications are blocked for this site in your browser settings. Allow notifications for this site, then
          reload this page.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={status === "on"}
            disabled={busy || status === "checking"}
            onClick={() => (status === "on" ? void disable() : void enable())}
            className="flex h-[23px] w-[42px] shrink-0 items-center rounded-full p-[2px] transition-colors disabled:opacity-60"
            style={{
              background: status === "on" ? "var(--color-accent)" : "var(--color-border)",
              justifyContent: status === "on" ? "flex-end" : "flex-start",
            }}
          >
            <span className="h-[19px] w-[19px] rounded-full bg-white" />
          </button>
          <span className="text-[13px] font-semibold text-ink-dark">
            {busy ? "Working…" : status === "on" ? "On" : "Off"}
          </span>
        </div>
      )}
      {error ? <p className="text-[12.5px] font-semibold text-danger">{error}</p> : null}
    </div>
  );
}
