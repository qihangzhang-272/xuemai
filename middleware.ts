import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/") && !path.startsWith("/api/xuemai/")) return NextResponse.json({ error: "原型接口未在本项目启用" }, { status: 404 });
  if (!path.startsWith("/api/") && !["/", "/dashboard", "/login", "/icon.svg", "/favicon.ico", "/xuemai-logo.png"].includes(path) && !path.startsWith("/_next/")) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
