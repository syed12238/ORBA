import { NextResponse } from "next/server";
import { ApiResponse } from "@/types";

export function successResponse<T>(data: T, status = 200) {
  const body: ApiResponse<T> = {
    data,
    error: null,
  };
  return NextResponse.json(body, { status });
}

export function errorResponse(code: string, message: string, status = 400, details?: any) {
  const body: ApiResponse = {
    data: null,
    error: {
      code,
      message,
      details,
    },
  };
  return NextResponse.json(body, { status });
}
