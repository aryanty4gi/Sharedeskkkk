import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoginPage } from "@/components/ui/animated-characters-login-page";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthRouteComponent,
});

function AuthRouteComponent() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled && data.user) {
        navigate({ to: "/", replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return <LoginPage />;
}
