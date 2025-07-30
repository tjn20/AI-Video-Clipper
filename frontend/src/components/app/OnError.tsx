"use client";

import React, { useEffect } from "react";
import { toast } from "sonner";

export default function OnError({
  message,
  showToast = true,
  children,
}: Readonly<{
  message: string;
  showToast?: boolean;
  children: React.ReactNode;
}>) {
  useEffect(() => {
    if (showToast) toast.warning(message);
  }, [message, showToast]);

  return children;
}
