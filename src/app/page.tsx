"use client";

import React from "react";
import { FeedList } from "@/components/feed/FeedList";

export default function HomePage() {
  return (
    <div className="w-full min-h-screen">
      <FeedList />
    </div>
  );
}
