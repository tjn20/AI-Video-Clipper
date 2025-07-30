import type { $Enums } from "@prisma/client";
import { Badge } from "../ui/badge";
import type { FileWithClips } from "~/types/fileWithClips.types";
import ClipCard from "./clip-card";
import { REPLAC_EUNDERSCORE } from "~/lib/utils";
function fileStatusNotAllowed(status: $Enums.FileStatus): boolean {
  if (status === "DISALLOWED" || status === "NO_CREDITS" || status === "FAILED")
    return true;
  else return false;
}

export default function VideoCard({ file }: { file: FileWithClips }) {
  const clipsCount = file.clips.length;
  return (
    <div className="animate-in fade-in-25 slide-in-from-bottom-35 border-primary/40 bg-card flex w-full flex-col gap-1 rounded-xl border p-4 shadow-md transition duration-300">
      <div className="flex items-center justify-between">
        <div className="flex max-w-[90%] flex-col truncate">
          <h3 className="font-semibold">{file.name}</h3>
          {file.translated_to && (
            <span className="pl-1 text-sm text-slate-500 capitalize">
              Translated To {file.translated_to.toLowerCase()}
            </span>
          )}
        </div>
        <Badge
          variant={
            fileStatusNotAllowed(file.status) ? "destructive" : "secondary"
          }
        >
          {REPLAC_EUNDERSCORE(file.status)}
        </Badge>
      </div>
      {!fileStatusNotAllowed(file.status) && (
        <div className="w-fit border-b text-sm text-slate-500">
          {clipsCount > 0
            ? `${clipsCount} Clips`
            : file.status === "PROCESSED"
              ? "No Clips Found"
              : "No Clips Generated Yet."}
        </div>
      )}
      {file.status !== "NO_CREDITS" && (
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(500px,1fr))] gap-4">
          {file.clips.map((clip, index) => (
            <ClipCard clip={clip} key={index} />
          ))}
        </div>
      )}
    </div>
  );
}
