import { Headset } from "lucide-react";
import { cookies } from "next/headers";
import ClientPortalShell from "@/app/components/portal/ClientPortalShell";
import SupportCenterPage from "@/app/components/support/SupportCenterPage";
import { getUserById } from "@/lib/db";

export default async function ClientSupportPage() {
  // NOTE: mirrors whatever session lookup your other /client/* pages already
  // use — swap this for that shared helper if it differs (this zip didn't
  // include app/client/page.tsx, so I matched the cookie name the support
  // API routes already read: "user_id").
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const user = userId ? await getUserById(userId) : null;

  return (
    <ClientPortalShell active="support" title="Support Center" icon={<Headset className="w-5 h-5" />} userName={user?.name ?? "there"}>
      <SupportCenterPage />
    </ClientPortalShell>
  );
}
