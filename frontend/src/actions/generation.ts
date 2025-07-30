"use server";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { revalidatePath } from "next/cache";
import { v4 as uuid } from "uuid";
import { env } from "~/env";
import { inngest } from "~/inngest/client";
import {
  VIDEO_UPLOAD_SCHEMA,
  type VideoUploadForm,
} from "~/schemas/fileUpload";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import type { ClipVariant } from "~/types/clipVariant.types";

export async function getClipVariantUrl(variant: ClipVariant): Promise<{
  url?: string;
  status: number;
  message: string;
}> {
  const session = await auth();
  if (!session?.user?.id)
    return {
      status: 401,
      message: "Unauthorized",
    };
  try {
    const s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const cmd = new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: variant.s3Key,
    });

    const signedUrl = await getSignedUrl(s3Client, cmd, {
      expiresIn: 3600,
    });
    return {
      status: 200,
      url: signedUrl,
      message: "URL generated",
    };
  } catch (error) {
    return {
      status: 400,
      message: "Something Went Wrong!",
    };
  }
}

export async function generateFileUploadUrl(
  fileName: string,
  fileContentType: string,
): Promise<{
  url?: string;
  key?: string;
  status: number;
  message: string;
}> {
  const session = await auth();
  if (!session?.user?.id)
    return {
      status: 401,
      message: "Unauthorized",
    };

  try {
    const s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const Id = uuid();
    const key = `${Id}/${fileName}_original.mp4`;
    const CMD = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: fileContentType,
    });
    const signedUrl = await getSignedUrl(s3Client, CMD, {
      expiresIn: 600,
    });

    return {
      key: key,
      url: signedUrl,
      status: 200,
      message: "",
    };
  } catch (error) {
    return {
      status: 400,
      message: "Something Went Wrong!",
    };
  }
}

export async function processUploadedVideo(
  s3Key: string,
  data: Omit<VideoUploadForm, "file">,
): Promise<{
  status: number;
  message: string;
  description?: string;
}> {
  const session = await auth();
  if (!session?.user?.id)
    return {
      status: 401,
      message: "Unauthorized",
    };

  const validatedData = VIDEO_UPLOAD_SCHEMA.omit({
    file: true,
  }).safeParse(data);
  if (!validatedData.success) {
    const errorMessage =
      validatedData.error.issues[0]?.message ?? "Invalid input";
    return {
      message: errorMessage,
      status: 422,
    };
  }
  try {
    const uploadedVideo = await db.file.create({
      data: {
        userId: session.user.id,
        name: data.fileName,
        s3Key,
        translated_to: validatedData.data.translate_to_language ?? null,
      },
    });
    await inngest.send({
      name: "video.processing_requested",
      data: {
        fileId: uploadedVideo.id,
        translate_to_language: validatedData.data.translate_to_language,
        subtitles_font_name: validatedData.data.subtitles_font_name,
        subtitles_alignment: validatedData.data.subtitles_alignment,
        add_subtitles_to_vertical_clip:
          validatedData.data.add_subtitles_to_vertical_clip,
      },
    });
    revalidatePath("/");
    return {
      message: "Clips will be generated soon.",
      status: 200,
      description: "Video has been scheduled and will be processed soon.",
    };
  } catch (error) {
    return {
      status: 400,
      message: "Something Went Wrong!",
    };
  }
}
