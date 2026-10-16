// API Client for Global Mandiri Computer (GMC) Admin & Public Backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Returns raw Fetch Response with credentials included by default
 */
export async function apiClient(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include", // Required for httpOnly cookies (gmc_admin_session)
  });
}

/**
 * Fetches JSON directly with typed error handling
 */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiClient(path, options);

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      // not json
    }
    const message =
      errorData?.message ||
      errorData?.error ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, errorData);
  }

  // If 204 or no content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
