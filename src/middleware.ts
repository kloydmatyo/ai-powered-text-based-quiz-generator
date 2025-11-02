import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Middleware is currently disabled as authentication is handled directly in API routes
  // This can be re-enabled if needed for other purposes
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
