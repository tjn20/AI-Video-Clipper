"use client";
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
import { useForm, Controller } from "react-hook-form";
import Dropzone, { useDropzone } from "react-dropzone";
import { Inbox } from "lucide-react";
export default function FileUploadModal() {
  const { control, handleSubmit } = useForm();

  const onSubmit = (data) => {
    console.log(data); // You will see the File object here
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FileInput control={control} name="files" />
      <button type="submit">Submit</button>
    </form>
  );
}
const FileInput = ({ control, name }) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <Dropzone onDrop={onChange}>
          {({ getRootProps, getInputProps, isDragActive }) => (
            <div className="rounded-xl p-2">
              <div
                {...getRootProps({
                  className:
                    "border-dashed border-2 rounded-xl cursor-pointer bg-gray-50 py-8 flex justify-center items-center flex-col dark:bg-main",
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
              {value &&
                value.map((file) => <div key={file.path}>{file.path}</div>)}
            </div>
          )}
        </Dropzone>
      )}
    />
  );
};
