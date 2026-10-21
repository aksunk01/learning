"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MagicCallback() {
  const router = useRouter();

  useEffect(() => {
    const match = window.location.hash.match(/token=([^&]+)/);

    if (match) {
      localStorage.setItem("access_token", match[1]);
      router.replace("/dashboard");
    } else {
      router.replace("/");
    }
  }, [router]);

  return null;
}
