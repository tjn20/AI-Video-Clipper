import { Prisma } from "@prisma/client";
const fileWithClips = Prisma.validator<Prisma.FileDefaultArgs>()({
  select: {
    id: true,
    name: true,
    s3Key: true,
    status: true,
    createdAt: true,
    translated_to: true,
    clips: {
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
    },
  },
});
export type FileWithClips = Prisma.FileGetPayload<typeof fileWithClips>;
