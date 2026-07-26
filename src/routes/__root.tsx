import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Error 404
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">This route doesn't exist.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition"
        >
          Back to ShareDesk
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-destructive">
          System fault
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{error.message || "Something went wrong"}</h1>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ShareDesk Workplace â€” Nuberg Engineering" },
      {
        name: "description",
        content: "Secure internal messaging and document sharing for Nuberg Engineering employees.",
      },
      { property: "og:title", content: "ShareDesk Workplace â€” Nuberg Engineering" },
      { name: "twitter:title", content: "ShareDesk Workplace â€” Nuberg Engineering" },
      {
        property: "og:description",
        content: "Secure internal messaging and document sharing for Nuberg Engineering employees.",
      },
      {
        name: "twitter:description",
        content: "Secure internal messaging and document sharing for Nuberg Engineering employees.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
  { rel: "icon", type: "image/png", sizes: "512x512", href: "/favicon.png?v=2" },
  { rel: "shortcut icon", type: "image/png", href: "/favicon.png?v=2" },
  { rel: "apple-touch-icon", sizes: "512x512", href: "/favicon.png?v=2" },

  { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="font-sans">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}

