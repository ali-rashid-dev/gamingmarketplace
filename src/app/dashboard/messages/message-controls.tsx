"use client";

import { useState, useTransition } from "react";
import {
  MAX_MESSAGE_ATTACHMENTS,
  isMessageAttachment,
  type MessageAttachment,
} from "@/lib/messaging";
import { reportConversation, uploadConversationAttachment } from "../actions";

const reasons = ["ABUSE", "HARASSMENT", "SPAM", "FRAUD", "OTHER"] as const;

export function MessageAttachmentList({ attachments }: { attachments: unknown }) {
  if (!Array.isArray(attachments)) return null;
  const validAttachments = attachments.filter(isMessageAttachment);
  if (!validAttachments.length) return null;
  return (
    <ul className="mt-3 space-y-2 border-t border-border/70 pt-3">
      {validAttachments.map((attachment) => (
        <li key={attachment.url}>
          <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            className="break-all text-xs font-medium text-primary underline underline-offset-2"
          >
            {attachment.name} · {(attachment.size / 1024).toFixed(0)} KB
          </a>
        </li>
      ))}
    </ul>
  );
}

export function MessageAttachmentPicker({
  conversationId,
  attachments,
  onChange,
  disabled,
}: {
  conversationId: string;
  attachments: MessageAttachment[];
  onChange: (attachments: MessageAttachment[]) => void;
  disabled: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setUploading(true);
    try {
      const selected = Array.from(files).slice(0, MAX_MESSAGE_ATTACHMENTS - attachments.length);
      const uploaded = [...attachments];
      for (const file of selected) {
        const result = await uploadConversationAttachment(conversationId, file);
        if (!result.success) throw new Error(result.error);
        uploaded.push(result.data);
      }
      onChange(uploaded);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload attachment");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-3">
      <label className="inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
        {uploading ? "Uploading…" : "Attach file"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          disabled={disabled || uploading || attachments.length >= MAX_MESSAGE_ATTACHMENTS}
          onChange={(event) => {
            void uploadFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
          className="sr-only"
        />
      </label>
      <span className="ml-2 text-[11px] text-muted-foreground">JPEG, PNG, WebP or PDF · 5 MB max · up to 4 files</span>
      {attachments.length > 0 && (
        <ul className="mt-2 space-y-1">
          {attachments.map((attachment, index) => (
            <li key={attachment.url} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">{attachment.name}</span>
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => onChange(attachments.filter((_, itemIndex) => itemIndex !== index))}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ReportConversation({
  conversationId,
  reported = false,
}: {
  conversationId: string;
  reported?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number]>("ABUSE");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(reported);
  const [busy, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const result = await reportConversation(conversationId, reason, details);
        if (!result.success) throw new Error(result.error);
        setSubmitted(true);
        setOpen(false);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to report conversation");
      }
    });
  }

  if (submitted) return <p className="text-xs text-muted-foreground">Conversation reported to support.</p>;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        {open ? "Cancel report" : "Report conversation"}
      </button>
      {open && (
        <form onSubmit={submit} className="mt-3 space-y-3 rounded-lg border border-border p-3">
          <label className="block text-xs text-muted-foreground">
            Reason
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as (typeof reasons)[number])}
              className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
            >
              {reasons.map((item) => (
                <option key={item} value={item}>{item.replaceAll("_", " ").toLowerCase()}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted-foreground">
            Details (optional)
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={1000}
              rows={3}
              className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
            />
          </label>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit report"}
          </button>
        </form>
      )}
    </div>
  );
}
