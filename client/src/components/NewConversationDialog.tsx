import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewConversationDialogProps {
  onCreateConversation: (payload: { phone: string }) => void;
  triggerClassName?: string;
  showLabel?: boolean;
}

export function NewConversationDialog({
  onCreateConversation,
  triggerClassName,
  showLabel = true,
}: NewConversationDialogProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("964");
  const isValidPhone = /^\d{13,15}$/.test(phone.trim());

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) return;
    if (!isValidPhone) {
      setPhone("964");
      return;
    }

    onCreateConversation({
      phone: trimmed,
    });
    setPhone("964");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          className={cn("h-9 gap-2 rounded-full px-4", triggerClassName)}
          data-testid="button-new-conversation"
        >
          <MessageSquarePlus className="h-4 w-4" />
          {showLabel && <span>New chat</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-new-conversation">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>
              Enter a phone number to start a new WhatsApp conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="9647xxxxxxxxx"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="font-mono"
                data-testid="input-phone-number"
              />
              <p className="text-xs text-muted-foreground">
                Country code is required. Default is 964. Minimum 10 digits after the 964 sign.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setPhone("964");
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValidPhone} data-testid="button-start-chat">
              Start Chat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
