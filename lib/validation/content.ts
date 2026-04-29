import { z } from "zod";
import { optionalTrimmedString } from "@/lib/validation/helpers";

export const contentPublishSchema = z.object({
  projectId: z.string().min(1, "Project ID is required."),
  title: z.string().trim().min(1, "Title is required."),
  html: z.string().trim().min(1, "HTML content is required."),
  excerpt: optionalTrimmedString(),
  slug: optionalTrimmedString(200),
  status: z.enum(["draft", "publish"]).optional(),
});
