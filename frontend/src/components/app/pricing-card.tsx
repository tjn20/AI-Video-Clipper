"use client";
import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Check, Layers } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import type { CreditPlan } from "~/types/pricingPlan.types";
import { cn } from "~/lib/utils";
import { useRouter } from "next/navigation";
import { createStripeCheckoutSession } from "~/actions/stripe";
import { toast } from "sonner";

export default function PricingCard({ plan }: { plan: CreditPlan }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const features = plan.features as string[];
  const isRequestedActionVerified = async (response: {
    message: string;
    status: number;
  }): Promise<boolean> => {
    if (response.status === 200) return true;
    else if (response.status === 401) router.push("/login");
    else if (response.status === 400) toast.info(response.message);
    return false;
  };
  const onClick = async () => {
    setIsCreating(true);
    try {
      const result = await createStripeCheckoutSession(plan.slug);
      if (await isRequestedActionVerified(result)) {
        router.push(result.url!);
      }
    } catch (error) {
      console.log(error);
      toast.warning("Something Went Wrong!");
    } finally {
      setIsCreating(false);
    }
  };
  return (
    <Card
      className={cn(
        "flex flex-col gap-6 py-6",
        plan.isPopular && "border-primary relative",
      )}
    >
      {plan.isPopular && (
        <Badge className="absolute -top-3 left-[35%]">Most Popular</Badge>
      )}

      <CardHeader className="flex flex-col items-center gap-2 text-center">
        <Layers className="mb-4" size={48} />
        <CardTitle className="text-2xl font-semibold">{plan.title}</CardTitle>
        <div className="flex items-baseline space-x-1">
          <span className="text-4xl font-bold">{`$${plan.price}`}</span>
        </div>
        <CardDescription className="pt-3">{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <ul className="space-y-4">
          {features.map((feature, indx) => (
            <li key={indx} className="flex items-center space-x-2">
              <Check className="text-primary h-5 w-5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="mt-auto px-6">
        <Button
          disabled={isCreating}
          variant={plan.isPopular ? "default" : "outline"}
          className="w-full cursor-pointer"
          onClick={() => onClick()}
        >
          {`Buy ${plan.credits} credits`}
        </Button>
      </CardFooter>
    </Card>
  );
}
