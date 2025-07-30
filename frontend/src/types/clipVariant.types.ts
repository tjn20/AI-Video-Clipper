import { Prisma } from "@prisma/client";

const clipVariant = Prisma.validator<Prisma.ClipVariantDefaultArgs>()({
  select: {
    id: true,
    type: true,
    s3Key: true,
  },
});

export type ClipVariant = Prisma.ClipVariantGetPayload<typeof clipVariant>;
