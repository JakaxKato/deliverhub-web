import { z } from "zod";

const attachmentLinkSchema = z.url({ protocol: /^https$/ });

export function getAttachmentLinkError(value: string): string | null {
  return attachmentLinkSchema.safeParse(value).success
    ? null
    : "Use a valid HTTPS URL on a public hostname (for example, https://example.com/file).";
}
