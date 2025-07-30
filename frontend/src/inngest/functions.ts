import { db } from "~/server/db";
import { inngest } from "./client";
import type { Clip, DBClip, FileUpload } from "~/types/uploadedFile.types";
import { env } from "~/env";
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

export const processVideo = inngest.createFunction(
  {
    id: "video-processing",
    concurrency: {
      limit: 1,
      key: "event.data.userId",
    },
    retries: 2,
  },
  {
    event: "video.processing_requested",
  },
  async ({ event, step }) => {
    const {
      fileId,
      translate_to_language,
      subtitles_font_name,
      subtitles_alignment,
      add_subtitles_to_vertical_clip,
    } = event.data;

    try {
      const {
        id: userId,
        credits,
        fileS3Key,
        fileName,
      } = await step.run("check-user-credits", async () => {
        const file = await db.file.findUniqueOrThrow({
          where: { id: fileId },
          select: {
            User: {
              select: {
                id: true,
                credits: true,
              },
            },
            s3Key: true,
            name: true,
          },
        });
        if (!file.User) throw new Error("User not found for this file.");
        return { ...file.User, fileS3Key: file.s3Key, fileName: file.name };
      });
      if (credits > 0) {
        await step.run("update-file-status", async () => {
          await db.file.update({
            where: {
              id: fileId,
            },
            data: {
              status: "PROCESSING",
            },
          });
        });
        const result = await step.run("upload-file", async () => {
          const apiResponse = await fetch(env.VIDEO_CLIPPER_API, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.AUTH_TOKEN}`,
            },
            body: JSON.stringify({
              s3_key: fileS3Key,
              credits,
              translate_to_language: translate_to_language?.toLowerCase(),
              subtitles_alignment,
              subtitles_font_name,
              add_subtitles_to_vertical_clip,
            }),
          });

          if (!apiResponse.ok) {
            throw new Error(`Upload failed: ${apiResponse.statusText}`);
          }

          const data: FileUpload = await apiResponse.json();
          console.log(typeof data);
          return data;
        });

        const totalClipsDuration = await step.run("process-clips", async () => {
          if ("message" in result) {
            await db.file.update({
              where: {
                id: fileId,
              },
              data: {
                status:
                  result.message === "disallowed" ? "DISALLOWED" : "FAILED",
              },
            });
            return 0;
          } else {
            const s3Folder: string = fileS3Key.split("/")[0]!;
            const keys = await listS3Objects(s3Folder);
            const clipsKeys = keys.filter(
              (key): key is string =>
                key !== `${s3Folder}/${fileName}_original.mp4` &&
                key !== `${s3Folder}/${fileName}_vertical.mp4`,
            );

            if (clipsKeys.length > 0) {
              for (const clip of result.segments) {
                const dbClip = await db.clip.create({
                  data: { ...toDBClip(clip), fileId },
                });

                await Promise.all([
                  db.clipVariant.create({
                    data: {
                      clipId: dbClip.id,
                      s3Key: `${s3Folder}/${clip.name}.mp4`,
                      type: "NORMAL",
                    },
                  }),
                  db.clipVariant.create({
                    data: {
                      clipId: dbClip.id,
                      s3Key: `${s3Folder}/${clip.name}_vertical.mp4`,
                      type: "VERTICAL",
                    },
                  }),
                ]);
              }
            }
            return result.totalClipsDuration;
          }
        });

        await step.run("deduct-credits", async () => {
          console.log(totalClipsDuration);
          await db.user.update({
            where: {
              id: userId,
            },
            data: {
              credits: {
                decrement: Math.max(Math.ceil(totalClipsDuration / 60), 0),
              },
            },
          });
        });

        await step.run("update-file-status", async () => {
          await db.file.update({
            where: {
              id: fileId,
            },
            data: {
              status: "PROCESSED",
            },
          });
        });
      } else {
        await step.run("update-file-status-to-no-credits", async () => {
          await db.file.update({
            where: {
              id: fileId,
            },
            data: {
              status: "NO_CREDITS",
            },
          });
        });
      }
    } catch (error) {
      console.log("catched Error ", error);
      await db.file.update({
        where: {
          id: fileId,
        },
        data: {
          status: "FAILED",
        },
      });
    }
  },
);

async function listS3Objects(s3Folder: string): Promise<string[]> {
  const client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const listCMD = new ListObjectsV2Command({
    Bucket: env.S3_BUCKET,
    Prefix: s3Folder,
  });
  const response = await client.send(listCMD);
  return (
    (response.Contents?.map((item) => item.Key).filter(Boolean) as string[]) ??
    []
  );
}

function toDBClip(clip: Clip): DBClip {
  return {
    name: clip.name,
    caption: clip.caption,
    duration: clip.end - clip.start,
  };
}
