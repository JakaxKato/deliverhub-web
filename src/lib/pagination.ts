import { CanceledError } from "axios";
import { z } from "zod";
import type { ListResponse } from "../types";
import { getSessionIdentity, isSessionIdentityCurrent } from "./session-cache";

export const ALL_PAGE_ROWS = 100;
export const MAX_COLLECTION_PAGES = 1000;

const listPageSchema = z.object({
  success: z.literal(true),
  data: z.array(z.object({ id: z.string().min(1) })),
  meta: z.object({
    page: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    rows: z.number().int().min(1).max(100),
    total: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    totalPages: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  }),
});

export function validateListPage<T extends { id: string }>(
  body: ListResponse<T>,
  page: number,
  rows: number,
): ListResponse<T> {
  const parsed = listPageSchema.safeParse(body);
  if (!parsed.success) throw new Error("Invalid list response or pagination metadata.");
  const meta = parsed.data.meta;
  const expectedPages = Math.ceil(meta.total / rows);
  if (
    meta.page !== page ||
    meta.rows !== rows ||
    (meta.totalPages !== expectedPages && !(meta.total === 0 && meta.totalPages === 1)) ||
    body.data.length !== Math.min(rows, Math.max(0, meta.total - (page - 1) * rows))
  ) {
    throw new Error("Inconsistent list pagination. Refresh and try again.");
  }
  return body;
}

export async function fetchAllPages<T extends { id: string }>(
  loadPage: (pagination: { page: number; rows: number }) => Promise<ListResponse<T>>,
  signal?: AbortSignal,
): Promise<T[]> {
  const identity = getSessionIdentity();
  const collected: T[] = [];
  const seen = new Set<string>();
  let totalPages = 1;
  let expectedTotal: number | undefined;
  let expectedPages: number | undefined;

  for (let page = 1; page <= totalPages; page += 1) {
    if (signal?.aborted || !isSessionIdentityCurrent(identity)) {
      throw new CanceledError("List loading canceled or session changed.");
    }
    const body = validateListPage(
      await loadPage({ page, rows: ALL_PAGE_ROWS }),
      page,
      ALL_PAGE_ROWS,
    );
    if (signal?.aborted || !isSessionIdentityCurrent(identity)) {
      throw new CanceledError("List loading canceled or session changed.");
    }
    if (body.meta.totalPages > MAX_COLLECTION_PAGES) {
      throw new Error("This list exceeds the 1,000-page safety bound. Narrow the project scope.");
    }
    if (
      expectedTotal !== undefined &&
      (body.meta.total !== expectedTotal || body.meta.totalPages !== expectedPages)
    ) {
      throw new Error("The list changed while loading. Refresh and try again.");
    }
    expectedTotal = body.meta.total;
    expectedPages = body.meta.totalPages;
    totalPages = body.meta.totalPages;
    for (const item of body.data) {
      if (seen.has(item.id))
        throw new Error("Duplicate entries while paging. Refresh and try again.");
      seen.add(item.id);
      collected.push(item);
    }
  }
  return collected;
}
