import { Megaphone } from "lucide-react";
import { cookies } from "next/headers";
import ClientPortalShell from "@/app/components/portal/ClientPortalShell";
import { getUserById } from "@/lib/db";
import FeedbackForm from "./FeedbackForm";

export default async function ClientFeedbackPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const user = userId ? await getUserById(userId) : null;

  return (
    <ClientPortalShell active="feedback" title="Feedback" icon={<Megaphone className="w-5 h-5" />} userName={user?.name ?? "there"}>
      <FeedbackForm defaultName={user?.name ?? ""} defaultEmail={user?.email ?? ""} />
    </ClientPortalShell>
  );
}
