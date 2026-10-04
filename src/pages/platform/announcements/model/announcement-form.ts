import type { z } from "zod";
import type { platformCommunicationsOperations } from "@/shared/api";

export type AnnouncementFormData = z.infer<
  typeof platformCommunicationsOperations.createAnnouncement.requestSchema.shape.body
>;
