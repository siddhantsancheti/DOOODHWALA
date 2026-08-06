import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";

export type TermsRole = "customer" | "milkman";

interface TermsDoc {
  role: TermsRole;
  version: string;
  lastUpdated: string;
  title: string;
  markdown: string;
}

interface Props {
  role: TermsRole | null;
  onCancel: () => void;
  /** Called with the version the user actually saw and accepted. */
  onAccept: (version: string) => void | Promise<void>;
  submitting?: boolean;
}

/**
 * Terms acceptance gate shown after the user picks a role. Mirrors the mobile
 * TermsScreen: the document must be scrolled to the end before the agreement
 * checkbox unlocks, and the accepted version is passed back so the server can
 * reject a stale one.
 */
export function TermsDialog({ role, onCancel, onAccept, submitting }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: doc, isLoading, isError, refetch } = useQuery<TermsDoc>({
    queryKey: ["/api/legal/terms", role],
    enabled: !!role,
    queryFn: async () => {
      const res = await apiRequest(`/api/legal/terms/${role}`, "GET");
      return res.json();
    },
  });

  // Reset the gate whenever a different role's document is opened.
  useEffect(() => {
    setAgreed(false);
    setReachedEnd(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [role, doc?.version]);

  // A short document on a tall screen may never scroll — treat that as read.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 24) setReachedEnd(true);
  }, [doc?.markdown]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setReachedEnd(true);
  };

  return (
    <Dialog open={!!role} onOpenChange={(open) => { if (!open && !submitting) onCancel(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {doc?.title ?? "Terms & Conditions"}
          </DialogTitle>
          <DialogDescription>
            {doc ? `Last updated ${doc.lastUpdated} · India` : "Please review before continuing."}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex h-72 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <div className="flex h-72 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn't load the terms. You need a connection to continue.
            </p>
            <Button variant="outline" onClick={() => refetch()}>Try again</Button>
          </div>
        )}

        {doc && (
          <>
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-72 overflow-y-auto rounded-md border bg-muted/30 px-4 py-3"
            >
              <TermsMarkdown markdown={doc.markdown} />
            </div>

            <label className="flex cursor-pointer items-start gap-3 pt-1">
              <Checkbox
                checked={agreed}
                disabled={!reachedEnd}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <span className={`text-sm leading-snug ${reachedEnd ? "" : "text-muted-foreground"}`}>
                I have read and agree to the {doc.title} and the Privacy Policy.
                {!reachedEnd && (
                  <span className="ml-1 text-xs italic">(scroll to the end to enable)</span>
                )}
              </span>
            </label>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={onCancel} disabled={submitting}>
                Go back
              </Button>
              <Button
                onClick={() => onAccept(doc.version)}
                disabled={!agreed || submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Agree and continue
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ponytail: the terms only use h1/h2, bullets and **bold**. A markdown library
// would be more code than this. Swap it in if the documents grow links/tables.
function TermsMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return <h3 key={i} className="pt-3 text-sm font-semibold text-foreground">{bold(line.slice(3))}</h3>;
        }
        if (line.startsWith("# ")) {
          return <h2 key={i} className="text-base font-bold text-foreground">{bold(line.slice(2))}</h2>;
        }
        if (line.startsWith("- ")) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-primary">•</span>
              <span className="text-sm text-muted-foreground">{bold(line.slice(2))}</span>
            </div>
          );
        }
        return <p key={i} className="text-sm leading-relaxed text-muted-foreground">{bold(line)}</p>;
      })}
    </div>
  );
}

function bold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-foreground">{part}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>,
  );
}
