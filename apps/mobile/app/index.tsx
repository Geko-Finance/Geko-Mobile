import { Redirect } from "expo-router";

import { useSession } from "@/src/features/auth/session/SessionProvider";

export default function IndexRoute() {
  const { status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (status === "authenticated" || status === "locked") {
    return <Redirect href="/home" />;
  }

  return <Redirect href="/welcome" />;
}
