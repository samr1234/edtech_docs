import { NextResponse } from "next/server";

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const GENERIC = "Something went wrong, please try again later.";

function isKnownPrismaError(err: unknown): err is { code: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as Record<string, unknown>).code === "string" &&
    (err as Record<string, unknown>).code !== undefined
  );
}

export function handleError(err: unknown) {
  if (isKnownPrismaError(err)) {
    switch (err.code) {
      case "P2002":
        return apiError("A record with this value already exists.", 409);
      case "P2025":
        return apiError("The requested item could not be found.", 404);
      case "P2003":
        return apiError("A related item could not be found.", 400);
      case "P2016":
        return apiError("The requested item could not be found.", 404);
      default:
        return apiError(GENERIC, 500);
    }
  }
  if (err instanceof SyntaxError) {
    return apiError(GENERIC, 400);
  }
  return apiError(GENERIC, 500);
}
