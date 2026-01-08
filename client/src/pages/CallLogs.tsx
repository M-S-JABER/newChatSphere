import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, PhoneCall, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import {
  CALL_LOG_UPDATED_EVENT,
  readCallLog,
  type CallLogEntry,
} from "@/lib/callLog";
import { cn } from "@/lib/utils";

const formatDuration = (seconds: number) => {
  if (!seconds) return "-";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
};

const outcomeLabel = (outcome: CallLogEntry["outcome"]) => {
  switch (outcome) {
    case "completed":
      return "Completed";
    case "declined":
      return "Declined";
    case "cancelled":
      return "Cancelled";
    case "missed":
      return "Missed";
    default:
      return "Unknown";
  }
};

const outcomeClassName = (outcome: CallLogEntry["outcome"]) => {
  switch (outcome) {
    case "completed":
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-600";
    case "declined":
      return "border-amber-500/30 bg-amber-500/15 text-amber-600";
    case "cancelled":
      return "border-muted/40 bg-muted/60 text-muted-foreground";
    case "missed":
      return "border-red-500/30 bg-red-500/15 text-red-500";
    default:
      return "border-muted/40 bg-muted/60 text-muted-foreground";
  }
};

export default function CallLogs() {
  const { user } = useAuth();
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);

  useEffect(() => {
    const syncLogs = () => setCallLogs(readCallLog());
    syncLogs();
    window.addEventListener(CALL_LOG_UPDATED_EVENT, syncLogs);
    window.addEventListener("storage", syncLogs);
    return () => {
      window.removeEventListener(CALL_LOG_UPDATED_EVENT, syncLogs);
      window.removeEventListener("storage", syncLogs);
    };
  }, []);

  const sortedLogs = useMemo(
    () => [...callLogs].sort((a, b) => b.startedAt - a.startedAt),
    [callLogs],
  );

  if (!user) {
    return null;
  }

  if (user.role !== "admin") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <PhoneCall className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">Call logs are admin-only.</p>
        <Link href="/">
          <Button variant="secondary">Back to chats</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto bg-background">
      <div className="w-full space-y-6 px-4 py-6 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Call Logs</h1>
              <p className="text-sm text-muted-foreground">
                Full history of WhatsApp calls across all chats
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5" />
              Recent Calls
            </CardTitle>
            <CardDescription>
              {sortedLogs.length} call{sortedLogs.length === 1 ? "" : "s"} recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedLogs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 px-6 py-10 text-center text-sm text-muted-foreground">
                No call activity yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedLogs.map((entry) => {
                      const isIncoming = entry.direction === "incoming";
                      const Icon = isIncoming ? PhoneIncoming : PhoneOutgoing;
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {entry.displayName || entry.phone}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-full",
                                  isIncoming
                                    ? "bg-emerald-500/15 text-emerald-600"
                                    : "bg-indigo-500/15 text-indigo-600",
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              {isIncoming ? "Incoming" : "Outgoing"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={outcomeClassName(entry.outcome)}>
                              {outcomeLabel(entry.outcome)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {entry.startedAt ? format(new Date(entry.startedAt), "PP p") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatDuration(entry.durationSeconds)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
