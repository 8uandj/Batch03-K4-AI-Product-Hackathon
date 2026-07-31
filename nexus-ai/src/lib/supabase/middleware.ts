import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const privateRoutes = ["/project", "/dashboard", "/pm-dashboard", "/onboarding", "/profile", "/join", "/api/projects"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublishableKey) return response;

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isKanbanDemoRoute =
    pathname === "/project/demo/board" ||
    pathname.startsWith("/api/projects/demo/tasks");
  const isPrivateRoute =
    !isKanbanDemoRoute &&
    privateRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = pathname.startsWith("/login");
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isCallbackRoute = pathname.startsWith("/auth/callback");

  if (user && !isAuthRoute && !isOnboardingRoute && !isCallbackRoute && !pathname.startsWith("/api/")) {
    const { data: profile } = await supabase
      .from("users")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.onboarding_completed) {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = "/onboarding";
      onboardingUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(onboardingUrl);
    }
  }

  if (isPrivateRoute && !user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && user) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}
