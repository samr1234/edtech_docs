import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return apiError("A record with this value already exists", 409);
      case "P2025":
        return apiError("Record not found", 404);
      case "P2003":
        return apiError("Related record not found", 400);
      case "P2016":
        return apiError("Record not found", 404);
      default:
        return apiError(`Database error (${err.code})`, 500);
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return apiError("Invalid data provided", 400);
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return apiError("Database connection failed", 503);
  }
  if (err instanceof SyntaxError) {
    return apiError("Invalid JSON in request body", 400);
  }
  return apiError("Internal server error", 500);
}
