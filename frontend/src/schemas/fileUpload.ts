import z from "zod";

const COURSE_MATERIAL_MAX_FILE_SIZE = 200 * 1024 * 1024;
const COURSE_MATERIAL_ALLOWED_FILE_TYPE = "video/mp4";
export const VIDEO_UPLOAD_SCHEMA = z.object({
  file: z
    .array(
      z
        .instanceof(File, {
          message: "Video is required",
        })
        .refine((file) => file.type === COURSE_MATERIAL_ALLOWED_FILE_TYPE, {
          message: "Only Videos are allowed.",
        })
        .refine((file) => file.size < COURSE_MATERIAL_MAX_FILE_SIZE, {
          message: "File size must be less than 200MB.",
        }),
    )
    .min(1, {
      message: "Video is required",
    }),
  fileName: z.string().max(100),
  add_subtitles_to_vertical_clip: z.boolean().optional(),
  translate_to_language: z.enum(["ARABIC", "ENGLISH", "FRENCH"]).optional(),
  subtitles_font_name: z.enum(["Arial", "Sans-Caption-Regular"]),
  subtitles_alignment: z.enum(["BOTTOM", "TOP", "CENTER"]),
});

export type VideoUploadForm = z.infer<typeof VIDEO_UPLOAD_SCHEMA>;
