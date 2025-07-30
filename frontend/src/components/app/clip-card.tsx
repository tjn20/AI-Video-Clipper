import type { ClipWithVariants } from "~/types/clipWithVariants.types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Clapperboard, Videotape } from "lucide-react";
import { Suspense } from "react";
import Loading from "./loading";
import ClipVariantCard from "./clip-variant-card";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
export default function ClipCard({ clip }: { clip: ClipWithVariants }) {
  return (
    <div className="flex h-fit flex-row flex-wrap gap-[2px] rounded-2xl border py-3 pr-2 sm:flex-nowrap">
      <Tabs
        defaultValue="vertical"
        className="bottom-0 flex flex-row items-center"
      >
        <TabsList className="rotate-90">
          <TabsTrigger value="vertical">
            <Clapperboard className="rotate-[270deg]" />
          </TabsTrigger>
          <TabsTrigger value="horizontal">
            <Videotape className="rotate-[270deg]" />
          </TabsTrigger>
        </TabsList>
        {clip.variants.map((variant, index) => (
          <TabsContent
            value={variant.type === "NORMAL" ? "horizontal" : "vertical"}
            key={index}
          >
            <Suspense fallback={<Loading size={12} />}>
              <ClipVariantCard variant={variant} />
            </Suspense>
          </TabsContent>
        ))}
      </Tabs>
      <div className="flex grow flex-col justify-start self-start pl-3">
        <h2 className="text-xl font-bold">{clip.name}</h2>
        <p className="text-slate-600">{clip.caption}</p>
      </div>
    </div>
  );
}
