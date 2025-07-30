import { Prisma } from "@prisma/client";

const CreditPlan = Prisma.validator<Prisma.CreditPlanDefaultArgs>()({
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

export type CreditPlan = Prisma.CreditPlanGetPayload<typeof CreditPlan>;
