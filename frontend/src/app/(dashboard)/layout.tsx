import Navbar from "~/components/app/navbar";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { redirect } from "next/navigation";
export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
    <div className="bg-background flex min-h-[100dvh] flex-col">
      <Navbar user={existingUser} />
      {children}
    </div>
  );
}
