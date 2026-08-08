import { MapPin } from "lucide-react";
import { cookies } from "next/headers";
import ClientPortalShell from "@/app/components/portal/ClientPortalShell";
import { getUserById } from "@/lib/db";
import CoverageMapPanel from "./CoverageMapPanel";

export default async function ClientCoveragePage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const user = userId ? await getUserById(userId) : null;

  return (
    <ClientPortalShell active="coverage" title="Coverage Map" icon={<MapPin className="w-5 h-5" />} userName={user?.name ?? "there"}>
      <CoverageMapPanel />
    </ClientPortalShell>
  );
}
