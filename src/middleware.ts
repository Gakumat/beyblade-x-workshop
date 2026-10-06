import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Session refresh for admin pages, login and the server actions that edit collections.
  matcher: ["/admin/:path*", "/login", "/auth/:path*", "/collections/:path*", "/lab/:path*"],
};
