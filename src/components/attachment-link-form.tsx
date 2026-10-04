"use client";

import { Loader2, Paperclip } from "lucide-react";
import { getAttachmentLinkError } from "../lib/attachment-link";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface AttachmentLinkFormProps {
  name: string;
  url: string;
  isWriting: boolean;
  isPending: boolean;
  onNameChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onAttach: () => void;
}

export function AttachmentLinkForm({
  name,
  url,
  isWriting,
  isPending,
  onNameChange,
  onUrlChange,
  onAttach,
}: AttachmentLinkFormProps) {
  const urlError = getAttachmentLinkError(url);
  const canSubmit = Boolean(name.trim()) && urlError === null && !isWriting;

  return (
    <div className="space-y-2.5">
      <Input
        type="text"
        placeholder="Deliverable Name (e.g. Figma UI v2 or PR #42)"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
      />
      <Input
        type="url"
        placeholder="Deliverable URL (https://...)"
        value={url}
        aria-invalid={Boolean(url && urlError)}
        onChange={(e) => onUrlChange(e.target.value)}
      />
      {url && urlError && (
        <p role="alert" className="text-xs text-danger">
          {urlError}
        </p>
      )}
      <Button
        variant="primary"
        className="w-full"
        onClick={() => {
          if (canSubmit) onAttach();
        }}
        disabled={!canSubmit}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Paperclip className="w-4 h-4" strokeWidth={1.5} />
        )}
        Attach Deliverable
      </Button>
    </div>
  );
}
