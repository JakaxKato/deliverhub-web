"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/button";

export const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a comment before posting.")
    .max(4000, "Comments are limited to 4000 characters."),
});
export type CommentFormValues = z.infer<typeof commentSchema>;

interface CommentComposerProps {
  onSubmit: (values: CommentFormValues) => Promise<unknown>;
  isPending: boolean;
}

export function CommentComposer({ onSubmit, isPending }: CommentComposerProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: "" },
  });

  const busy = isPending || isSubmitting;

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
        reset({ body: "" });
      })}
      className="space-y-2"
    >
      <textarea
        aria-label="Add a comment"
        rows={3}
        placeholder="Share an update, blocker, or review note with the team..."
        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-faint transition-colors duration-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        {...register("body")}
      />
      <div className="flex items-center justify-between gap-3">
        <p role="alert" className="text-xs text-danger min-h-[1rem]">
          {errors.body?.message}
        </p>
        <Button type="submit" variant="primary" size="sm" disabled={busy} loading={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Post Comment
        </Button>
      </div>
    </form>
  );
}
