import { Redirect } from "expo-router";

import { ExploreScreen } from "@/features/listings/explore-screen";
import { useSession } from "@/providers/session-provider";

export default function PublicHomeScreen() {
  const { status } = useSession();
  if (status === "bootstrapping") return null;
  if (status === "authenticated") return <Redirect href="/(app)/(tabs)/explore" />;
  return <ExploreScreen />;
}
