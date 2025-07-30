import { toast } from "sonner";
import { getClipVariantUrl } from "~/actions/generation";
import type { ClipVariant } from "~/types/clipVariant.types";
import OnError from "./OnError";
import { FolderX } from "lucide-react";
export default async function ClipVariantCard({
  variant,
}: {
  variant: ClipVariant;
}) {
  const result = await getClipVariantUrl(variant);
  if (result.status !== 200)
    return (
      <OnError message={result.message}>
        <div className="w-52">
          <FolderX color="red" size={16} />
        </div>
      </OnError>
    );
  else
    return (
      <div className="w-54">
        <video
          src={result.url}
          controls
          preload="metadata"
          muted
          className="aspect-auto h-full w-full rounded-md object-cover opacity-100 transition-opacity duration-600"
        />
      </div>
    );
}
