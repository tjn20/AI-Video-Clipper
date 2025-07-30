import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import PricingCard from "~/components/app/pricing-card";
import { Button } from "~/components/ui/button";
import { db } from "~/server/db";

export default async function Page() {
  const plans = await db.creditPlan.findMany({
    select: {
      slug: true,
      title: true,
      price: true,
      features: true,
      isPopular: true,
      description: true,
      credits: true,
    },
  });
  return (
    <div className="bg-muted flex flex-1 flex-col px-4 py-12">
      <Button variant="outline" size="icon" asChild className="ms-6">
        <Link href="/">
          <ArrowLeftIcon className="size-4" />
        </Link>
      </Button>
      <div>
        <div className="container mx-auto px-4 md:px-6 2xl:max-w-[1400px]">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Buy Credits
              </h2>
              <p className="text-muted-foreground mx-auto max-w-[700px] md:text-xl">
                Purchase credits to generate educational clips by choosing the
                perfect plan for your needs.
              </p>
            </div>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3 lg:gap-8">
            {plans.map((plan, index) => (
              <PricingCard plan={plan} key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
