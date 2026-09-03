import axios from "axios";

/**
 * Default SWR fetcher. Kept tiny and shared so every `useSWR(key)` in the app
 * gets the same error shape: a thrown Error whose `.status` and `.info` carry
 * the response, matching how the hand-rolled `axios` calls were read before.
 */
export const swrFetcher = async <T = unknown>(url: string): Promise<T> => {
  try {
    const { data } = await axios.get<T>(url, {
      headers: { "Cache-Control": "no-store" },
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const wrapped = new Error(
        error.response?.data?.error || error.message || "Request failed",
      ) as Error & { status?: number; info?: unknown };
      wrapped.status = error.response?.status;
      wrapped.info = error.response?.data;
      throw wrapped;
    }
    throw error;
  }
};
