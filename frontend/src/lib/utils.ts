import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function AVATAR_FORMATTER(name: string): string {
  return name[0]?.toUpperCase() || "";
}

export function REPLAC_EUNDERSCORE(text: string): string {
  return text.replaceAll("_", " ");
}

export const FORMAT_FILE_SIZE = (fileSizeInBytes: number): string => {
  if (fileSizeInBytes < 1024) {
    return `${fileSizeInBytes}B`;
  } else if (fileSizeInBytes < 1024 ** 2) {
    return `${(fileSizeInBytes / 1024).toFixed(2)} KB`;
  } else if (fileSizeInBytes < 1024 ** 3) {
    return `${(fileSizeInBytes / 1024 ** 2).toFixed(2)} MB`;
  } else {
    return `${(fileSizeInBytes / 1024 ** 3).toFixed(2)} GB`;
  }
};
