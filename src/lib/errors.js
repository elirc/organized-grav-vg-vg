import { NextResponse } from "next/server";

export class AppError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

export function isAppError(error) {
  return error instanceof AppError;
}

export function toErrorResponse(error) {
  if (isAppError(error)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  console.error("Unhandled API error", error);

  return NextResponse.json(
    {
      ok: false,
      error: {
        message: "Internal server error",
      },
    },
    { status: 500 },
  );
}

export function assert(condition, status, message, details = null) {
  if (!condition) {
    throw new AppError(status, message, details);
  }
}
