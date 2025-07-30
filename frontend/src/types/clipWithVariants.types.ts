import { Prisma } from "@prisma/client";

const clipWithVariants = Prisma.validator<Prisma.ClipDefaultArgs>()({
  select: {
    id: true,
    name: true,
    caption: true,
    duration: true,
    createdAt: true,
    variants: {
      select: {
        id: true,
        type: true,
        s3Key: true,
      },
    },
  },
});

export type ClipWithVariants = Prisma.ClipGetPayload<typeof clipWithVariants>;
