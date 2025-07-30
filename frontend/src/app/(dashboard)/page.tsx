import { redirect } from "next/navigation";
import { Suspense } from "react";
import Dashboard from "~/components/app/dashboard";
import DashboardUpload from "~/components/app/dashboard-upload";
import Loading from "~/components/app/loading";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export default async function Page() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/login");

  const existingUser = await db.user.findUniqueOrThrow({
    where: {
      id: user.id,
    },
    select: {
      name: true,
      credits: true,
      id: true,
      email: true,
    },
  });
  return (
    <div className="flex w-[90%] flex-1 flex-col gap-4 self-center p-6">
      <DashboardUpload credits={existingUser.credits} />
      <Suspense fallback={<Loading />}>
        <Dashboard userId={existingUser.id} />
      </Suspense>
    </div>
  );
}
