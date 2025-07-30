import { Loader } from "lucide-react";

export default function Loading({ size = 22 }: { size?: number }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center">
      <Loader className="animate-spin" size={size} />
    </div>
  );
}
