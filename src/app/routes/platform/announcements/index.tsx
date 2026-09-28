import { createFileRoute } from "@tanstack/react-router";
import { PlatformAnnouncementsPage } from "@/pages/platform/announcements";

export const Route = createFileRoute("/platform/announcements/")({
  component: PlatformAnnouncementsPage,
});
