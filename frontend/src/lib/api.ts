const API_URL = process.env.NEXT_PUBLIC_API_URL;

// This lets us distinguish server errors (401, 403, 500)
// from network errors (no internet connection).
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiOptions extends RequestInit {}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  if (!API_URL) {
    throw new Error("API URL is not configured.");
  }

  // A network failure will throw a TypeError here.
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const responseText = await response.text();

  let result: any = {};

  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error("Server returned an invalid response.");
  }

  if (!response.ok) {
    throw new ApiError(
      result.message || "Something went wrong.",
      response.status,
    );
  }

  return result as T;
}
