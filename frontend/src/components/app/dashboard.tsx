import { db } from "~/server/db";
import VideoCard from "./video-card";
import DashboardHeader from "./dashboard-header";
import { CircleSlash } from "lucide-react";

export default async function Dashboard({ userId }: { userId: string }) {
  const data = await db.file.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      s3Key: true,
      status: true,
      createdAt: true,
      translated_to: true,
      clips: {
        select: {
          id: true,
          name: true,
          caption: true,
          duration: true,
          createdAt: true,
          variants: {
            select: {
              id: true,
              type: true,
              s3Key: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="flex flex-1 flex-col rounded-xl border p-6 shadow-md">
      <DashboardHeader videosCount={data.length} />
      {data.length > 0 ? (
        <div className="flex flex-col gap-4 pt-7">
          {data.map((video, index) => (
            <VideoCard file={video} key={index} />
          ))}
        </div>
      ) : (
        <span className="flex flex-1 items-center justify-center gap-2 font-bold">
          <CircleSlash />
          No Videos Uploaded Yet
        </span>
      )}
    </div>
  );
}
