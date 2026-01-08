import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MessageSquare, PhoneCall, PhoneIncoming, PhoneOff } from "lucide-react";

export type CallEndReason = "ended" | "declined" | "cancelled";

export type CallState = {
  id: string;
  conversationId?: string | null;
  direction: "incoming" | "outgoing";
  status: "ringing" | "active";
  displayName: string;
  phone: string;
  startedAt: number;
  connectedAt?: number | null;
};

type CallOverlayProps = {
  call: CallState | null;
  onAnswer: () => void;
  onEnd: (reason: CallEndReason) => void;
  onOpenChat: () => void;
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
};

export function CallOverlay({ call, onAnswer, onEnd, onOpenChat }: CallOverlayProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!call || call.status !== "active") {
      setNow(Date.now());
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [call]);

  const isIncoming = call?.direction === "incoming";
  const isActive = call?.status === "active";
  const isRinging = call?.status === "ringing";

  const statusLabel = useMemo(() => {
    if (!call) return "";
    if (isActive) return "In call";
    return isIncoming ? "Incoming WhatsApp call" : "Calling via WhatsApp";
  }, [call, isActive, isIncoming]);

  const subLabel = useMemo(() => {
    if (!call) return "";
    if (isActive) {
      const anchor = call.connectedAt ?? call.startedAt;
      const seconds = Math.max(0, Math.floor((now - anchor) / 1000));
      return formatDuration(seconds);
    }
    return isIncoming ? "Tap answer to connect" : "Ringing...";
  }, [call, isActive, isIncoming, now]);

  const handleDismiss = () => {
    if (isActive) {
      onEnd("ended");
      return;
    }
    if (isIncoming) {
      onEnd("declined");
      return;
    }
    onEnd("cancelled");
  };

  if (!call) return null;

  const initials = (call.displayName || call.phone || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Dialog
      open={Boolean(call)}
      onOpenChange={(open) => {
        if (!open) {
          handleDismiss();
        }
      }}
    >
      <DialogContent className="w-[min(440px,92vw)] max-w-[440px] rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl [&>button]:hidden">
        <div className="border-b border-border/60 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-primary">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  WhatsApp voice call
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {isIncoming ? "Incoming call" : "Outgoing call"}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {isActive ? "Active" : "Ringing"}
            </span>
          </div>
        </div>

        <div className="px-6 py-6 text-center">
          <div
            className={cn(
              "mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-border bg-background",
              isRinging && "ring-2 ring-primary",
            )}
          >
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <p className="mt-4 text-lg font-semibold text-foreground">
            {call.displayName || "Unknown caller"}
          </p>
          <p className="text-sm text-muted-foreground">{call.phone || "Hidden number"}</p>
          <div className="mt-3 text-sm font-semibold text-foreground">{statusLabel}</div>
          <div className="text-xs text-muted-foreground" aria-live="polite">
            {subLabel}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border/60 px-6 py-4">
          {isIncoming && isRinging && (
            <>
              <Button
                type="button"
                variant="destructive"
                onClick={() => onEnd("declined")}
                className="min-w-[130px] rounded-full"
                aria-label="Decline call"
              >
                <PhoneOff className="h-4 w-4" />
                Decline
              </Button>
              <Button
                type="button"
                onClick={onAnswer}
                className="min-w-[130px] rounded-full"
                aria-label="Answer call"
              >
                <PhoneIncoming className="h-4 w-4" />
                Answer
              </Button>
            </>
          )}

          {!isIncoming && isRinging && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => onEnd("cancelled")}
              className="min-w-[160px] rounded-full"
              aria-label="Cancel call"
            >
              <PhoneOff className="h-4 w-4" />
              Cancel call
            </Button>
          )}

          {isActive && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={onOpenChat}
                className="min-w-[140px] rounded-full"
              >
                <MessageSquare className="h-4 w-4" />
                Open chat
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => onEnd("ended")}
                className="min-w-[140px] rounded-full"
              >
                <PhoneOff className="h-4 w-4" />
                End call
              </Button>
            </>
          )}
        </div>

        <p className="px-6 pb-5 text-center text-[11px] text-muted-foreground">
          Calls require WhatsApp Business Calling access and recipient opt-in.
        </p>
      </DialogContent>
    </Dialog>
  );
}
