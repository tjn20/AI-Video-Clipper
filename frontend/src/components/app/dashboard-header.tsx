"use client";

import { RefreshCcw } from "lucide-react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

export default function DashboardHeader({
  videosCount,
}: {
  videosCount: number;
}) {
  const router = useRouter();

  function reloadPage() {
    router.push("/");
  }
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col justify-center">
        <h2 className="text-lg font-semibold">Videos</h2>
        <p className="text-sm">
          Browse your videos along with their generated clips. Please note,
          processing may take a few minutes.
        </p>
      </div>
      {videosCount > 0 && (
        <Button
          variant="ghost"
          className="cursor-pointer"
          title="Refresh"
          onClick={() => reloadPage()}
        >
          <RefreshCcw />
        </Button>
      )}
    </div>
  );
}
