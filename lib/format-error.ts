const GENERIC = "Something went wrong, please try again later.";

export async function parseApiError(res: Response): Promise<string> {
  if (res.status >= 500) return GENERIC;
  try {
    const data = await res.json();
    return data?.error || GENERIC;
  } catch {
    return GENERIC;
  }
}
