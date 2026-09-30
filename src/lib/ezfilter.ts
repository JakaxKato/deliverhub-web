export interface QueryFilterOptions {
  filters?: Record<string, any>;
  searchFilters?: Record<string, any>;
  rangedFilters?: { key: string; start: any; end: any }[];
  page?: number;
  rows?: number;
  orderKey?: string;
  orderRule?: "asc" | "desc";
}

/**
 * Builds standard NodeWave query parameters conforming to the specification.
 */
export function buildQueryParams(options: QueryFilterOptions): Record<string, string | number> {
  const params: Record<string, string | number> = {};

  if (options.filters && Object.keys(options.filters).length > 0) {
    // Only include non-empty values
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(options.filters)) {
      if (v !== undefined && v !== null && v !== "" && (!Array.isArray(v) || v.length > 0)) {
        cleaned[k] = v;
      }
    }
    if (Object.keys(cleaned).length > 0) {
      params.filters = JSON.stringify(cleaned);
    }
  }

  if (options.searchFilters && Object.keys(options.searchFilters).length > 0) {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(options.searchFilters)) {
      if (v !== undefined && v !== null && v !== "") {
        cleaned[k] = v;
      }
    }
    if (Object.keys(cleaned).length > 0) {
      params.searchFilters = JSON.stringify(cleaned);
    }
  }

  if (options.rangedFilters && options.rangedFilters.length > 0) {
    params.rangedFilters = JSON.stringify(options.rangedFilters);
  }

  if (options.page) params.page = options.page;
  if (options.rows) params.rows = options.rows;
  if (options.orderKey) params.orderKey = options.orderKey;
  if (options.orderRule) params.orderRule = options.orderRule;

  return params;
}
