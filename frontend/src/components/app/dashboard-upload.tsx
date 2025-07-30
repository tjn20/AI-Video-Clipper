"use client";

import { File, Inbox, UploadCloud } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import Dropzone from "react-dropzone";
import {
  Controller,
  useForm,
  type Control,
  type FieldValues,
} from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { FORMAT_FILE_SIZE } from "~/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import {
  VIDEO_UPLOAD_SCHEMA,
  type VideoUploadForm,
} from "~/schemas/fileUpload";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { Input } from "../ui/input";
import {
  generateFileUploadUrl,
  processUploadedVideo,
} from "~/actions/generation";
import { toast } from "sonner";
import Loading from "./loading";
import { useRouter } from "next/navigation";
export default function DashboardUpload({
  credits,
}: {
  credits: number | null;
}) {
  const router = useRouter();
  const [isUploading, setIsUplaoding] = useState(false);
  const dialogRef = useRef<HTMLButtonElement>(null);
  const form = useForm<VideoUploadForm>({
    resolver: zodResolver(VIDEO_UPLOAD_SCHEMA),
    defaultValues: {
      subtitles_alignment: "BOTTOM",
      subtitles_font_name: "Sans-Caption-Regular",
    },
  });

  const isRequestedActionVerified = (response: {
    message: string;
    status: number;
  }): boolean => {
    if (response.status === 200) return true;
    else if (response.status === 401) router.push("/login");
    else if (response.status === 400) toast.info(response.message);
    return false;
  };
  const onSubmit = async (data: VideoUploadForm) => {
    setIsUplaoding(true);
    const { file: _, ...newData } = data;
    const file = data.file[0] as File;
    try {
      const response = await generateFileUploadUrl(data.fileName, file.type);
      if (isRequestedActionVerified(response)) {
        const result = await fetch(response.url!, {
          headers: {
            "Content-Type": file.type,
          },
          method: "PUT",
          body: file,
        });
        if (!result.ok) toast.error("Failed To Upload Video! Try again");
        else {
          console.log("To Start Uploading");
          const res = await processUploadedVideo(response.key!, newData);
          if (isRequestedActionVerified(res))
            toast.success(res.message, {
              description: res.description,
            });

          form.reset();
          dialogRef.current?.click();
        }
      }
    } catch (error) {
      toast.error("Failed To Upload Video! Try again");
    } finally {
      setIsUplaoding(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center justify-between">
      <span className="pl-3 font-semibold text-slate-700">
        Upload your Educational Video to get AI-generated Clips
      </span>
      <Dialog>
        <DialogTrigger asChild ref={dialogRef}>
          <Button
            className="ms-auto cursor-pointer"
            disabled={!(credits && credits > 0)}
          >
            {credits && credits > 0 ? (
              <>
                <UploadCloud />
                Upload
              </>
            ) : (
              "No Credits"
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="overflow-y-auto sm:max-h-[95dvh] sm:max-w-[600px]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>Upload Video</DialogTitle>
                <DialogDescription>
                  Upload your Educational Video to get AI-generated Clips
                </DialogDescription>
              </DialogHeader>
              <div className="flex w-full flex-col gap-4">
                <FileInput control={form.control} name="file" />
                <div className="flex flex-col gap-4 px-2">
                  <FormField
                    control={form.control}
                    name="fileName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video Name</FormLabel>
                        <FormControl>
                          <Input placeholder="video" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="add_subtitles_to_vertical_clip"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                        <FormControl>
                          <Checkbox
                            className="border-black"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Show Subtitles</FormLabel>
                          <FormDescription>
                            You can add subtitles to the vertical clips.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="translate_to_language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Translated To</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl className="min-w-full">
                            <SelectTrigger>
                              <SelectValue placeholder="Select a language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ARABIC">Arabic</SelectItem>
                            <SelectItem value="ENGLISH">English</SelectItem>
                            <SelectItem value="FRENCH">French</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Language to translate the subtitles to.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subtitles_font_name"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Subtitle Font Name</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col"
                          >
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <RadioGroupItem value="Sans-Caption-Regular" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Sans Caption Regular
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <RadioGroupItem value="Arial" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Arial
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subtitles_alignment"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Subtitles Alignment</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col"
                          >
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <RadioGroupItem value="BOTTOM" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Bottom
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <RadioGroupItem value="TOP" />
                              </FormControl>
                              <FormLabel className="font-normal">Top</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <RadioGroupItem value="CENTER" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Center
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loading size={10} />
                      Generating
                    </>
                  ) : (
                    "Generate"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const FileInput = ({
  control,
  name,
}: {
  name: string;
  control: Control<FieldValues, any, FieldValues>;
}) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <Dropzone
          onDrop={onChange}
          maxFiles={1}
          accept={{
            "video/mp4": [".mp4"],
          }}
        >
          {({ getRootProps, getInputProps, isDragActive }) => (
            <div className="flex flex-col">
              <div className="rounded-xl p-2">
                <div
                  {...getRootProps({
                    className:
                      "border-dashed border-2 rounded-xl cursor-pointer bg-background py-8 flex justify-center items-center flex-col dark:bg-background",
                  })}
                >
                  <input {...getInputProps()} onBlur={onBlur} />
                  <>
                    <Inbox size={20} className="text-black dark:text-white" />
                    {isDragActive ? (
                      <p className="mt-2 text-sm text-slate-400 dark:text-slate-100">
                        Drop the files here ...
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-slate-400 dark:text-slate-100">
                        Drag and drop files here, or click to browse for files.
                      </p>
                    )}
                  </>
                </div>
              </div>
              {value &&
                value.map((file: File, index: number) => (
                  <div
                    key={index}
                    className="animate-in fade-in-0 slide-in-from-bottom-2 mb-4 flex flex-col px-3 duration-700"
                  >
                    <div
                      className={`border-gray-300" flex items-center justify-between rounded-lg border px-2`}
                    >
                      <div className="flex gap-2">
                        <File size="xl" className="mt-3 h-8 w-8" />
                        <div className="flex w-[310px] flex-col py-3 pl-2">
                          <p className="truncate text-sm font-semibold">
                            {file.name}
                          </p>
                          <span className="text-xs text-slate-400">
                            {FORMAT_FILE_SIZE(file.size)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              {
                <p className="text-error mt-1 pl-3 text-xs text-red-500">
                  {error?.message}
                </p>
              }
            </div>
          )}
        </Dropzone>
      )}
    />
  );
};
