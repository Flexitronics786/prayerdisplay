import React from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useNotificationSubscription } from "@/hooks/useNotificationSubscription";
import { useTVDisplay } from "@/hooks/useTVDisplay";

const NotificationBell: React.FC = () => {
    const isTV = useTVDisplay();
    const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } =
        useNotificationSubscription();

    // Don't show on TV displays or if not supported
    if (isTV || !isSupported) return null;

    const handleClick = async () => {
        if (isLoading) return;

        if (isSubscribed) {
            await unsubscribe();
        } else {
            const success = await subscribe();
            if (success) {
                // Show a test notification
                if (Notification.permission === "granted") {
                    new Notification("🕌 Notifications Enabled", {
                        body: "You'll receive alerts before each prayer time.",
                        icon: "/Logo 1.jpg",
                    });
                }
            }
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={isLoading || permission === "denied"}
            className={`relative p-2 rounded-full transition-all duration-200
        ${isSubscribed
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }
        ${permission === "denied" ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        ${isLoading ? "animate-pulse" : ""}
      `}
            title={
                permission === "denied"
                    ? "Notifications blocked — enable in browser settings"
                    : isSubscribed
                        ? "Prayer notifications ON — click to disable"
                        : "Get notified before prayer times"
            }
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : isSubscribed ? (
                <Bell className="w-5 h-5" />
            ) : (
                <BellOff className="w-5 h-5" />
            )}
            {isSubscribed && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
            )}
        </button>
    );
};

export default NotificationBell;
