import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Generate VAPID keys (you'll need to replace this with your actual public key)
// You can generate them at: https://vapidkeys.com/
const VAPID_PUBLIC_KEY = "BJyH0zNjdGsd8Dj6ItxFh2R_LJSDQBLkIXAZs9k5-LJpOdzviuCxIzrFBLKbDOOEtH84MMgZrLxT3JVBjEn3w-g";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

interface NotificationState {
    isSupported: boolean;
    isSubscribed: boolean;
    isLoading: boolean;
    permission: NotificationPermission | "default";
}

export const useNotificationSubscription = () => {
    const [state, setState] = useState<NotificationState>({
        isSupported: false,
        isSubscribed: false,
        isLoading: true,
        permission: "default",
    });

    // Check if push notifications are supported and if already subscribed
    useEffect(() => {
        const check = async () => {
            const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

            if (!supported) {
                setState({ isSupported: false, isSubscribed: false, isLoading: false, permission: "default" });
                return;
            }

            const permission = Notification.permission;

            try {
                const registration = await navigator.serviceWorker.getRegistration("/sw.js");
                if (registration) {
                    const subscription = await registration.pushManager.getSubscription();
                    setState({
                        isSupported: true,
                        isSubscribed: !!subscription,
                        isLoading: false,
                        permission,
                    });
                } else {
                    setState({ isSupported: true, isSubscribed: false, isLoading: false, permission });
                }
            } catch {
                setState({ isSupported: true, isSubscribed: false, isLoading: false, permission });
            }
        };

        check();
    }, []);

    const subscribe = useCallback(async () => {
        try {
            setState((s) => ({ ...s, isLoading: true }));

            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                setState((s) => ({ ...s, isLoading: false, permission }));
                return false;
            }

            // Register service worker
            const registration = await navigator.serviceWorker.register("/sw.js");
            await navigator.serviceWorker.ready;

            // Subscribe to push notifications
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
            });

            const subscriptionJson = subscription.toJSON();

            // Save to Supabase
            const { error } = await supabase.from("push_subscriptions").upsert(
                {
                    endpoint: subscriptionJson.endpoint!,
                    p256dh: subscriptionJson.keys!.p256dh,
                    auth: subscriptionJson.keys!.auth,
                },
                { onConflict: "endpoint" }
            );

            if (error) {
                console.error("Error saving subscription:", error);
                setState((s) => ({ ...s, isLoading: false }));
                return false;
            }

            setState({ isSupported: true, isSubscribed: true, isLoading: false, permission: "granted" });
            return true;
        } catch (error) {
            console.error("Error subscribing to notifications:", error);
            setState((s) => ({ ...s, isLoading: false }));
            return false;
        }
    }, []);

    const unsubscribe = useCallback(async () => {
        try {
            setState((s) => ({ ...s, isLoading: true }));

            const registration = await navigator.serviceWorker.getRegistration("/sw.js");
            if (registration) {
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    const endpoint = subscription.endpoint;
                    await subscription.unsubscribe();

                    // Remove from Supabase
                    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
                }
            }

            setState((s) => ({ ...s, isSubscribed: false, isLoading: false }));
            return true;
        } catch (error) {
            console.error("Error unsubscribing:", error);
            setState((s) => ({ ...s, isLoading: false }));
            return false;
        }
    }, []);

    return { ...state, subscribe, unsubscribe };
};
