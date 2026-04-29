import { z } from "zod";
import {
  optionalTrimmedString,
  optionalUrlString,
} from "@/lib/validation/helpers";

export const projectRulesSchema = z.object({
  preferredAngles: z.array(z.string().trim()).default([]),
  avoidPatterns: z.array(z.string().trim()).default([]),
  anchorGuidelines: z.string().trim().default(""),
});

export const contentPlaybookSchema = z.object({
  pillarTopics: z.array(z.string().trim()).default([]),
  freshnessCadence: z.string().trim().default(""),
  eeatNotes: z.array(z.string().trim()).default([]),
});

export const nichePlaybookSchema = z.object({
  positioning: z.string().trim().default(""),
  competitors: z.array(z.string().trim()).default([]),
  differentiators: z.array(z.string().trim()).default([]),
});

export const cmsProviderSchema = z.enum(["none", "wordpress", "webhook"]);
export const cmsPublishStatusSchema = z.enum(["draft", "publish"]);

export const createProjectProfileSchema = z.object({
  name: z.string().trim().min(1, "Project name is required."),
  websiteUrl: z.string().trim().url("Website URL must be a valid URL."),
  industry: z.string().trim().min(1, "Industry is required."),
  targetCountry: optionalTrimmedString(),
  targetAudience: optionalTrimmedString(),
  brandVoice: optionalTrimmedString(),
  businessGoal: optionalTrimmedString(),
  conversionGoals: z.array(z.string().trim()).optional(),
  primaryServices: z.array(z.string().trim()).optional(),
  backlinkRules: projectRulesSchema.optional(),
  contentPlaybook: contentPlaybookSchema.optional(),
  nichePlaybook: nichePlaybookSchema.optional(),
  searchConsoleSiteUrl: optionalTrimmedString(255),
  ga4PropertyId: optionalTrimmedString(120),
  cmsProvider: cmsProviderSchema.optional(),
  cmsBaseUrl: optionalUrlString("CMS base URL must be a valid URL."),
  cmsUsername: optionalTrimmedString(120),
  cmsAppPassword: z.string().optional(),
  cmsWebhookUrl: optionalUrlString("CMS webhook URL must be a valid URL."),
  cmsPublishStatus: cmsPublishStatusSchema.optional(),
  notes: optionalTrimmedString(),
  isDefault: z.boolean().optional(),
});

export const updateProjectProfileSchema = z.object({
  name: z.string().trim().min(1).optional(),
  websiteUrl: optionalUrlString("Website URL must be a valid URL."),
  industry: z.string().trim().min(1).optional(),
  targetCountry: optionalTrimmedString(),
  targetAudience: optionalTrimmedString(),
  brandVoice: optionalTrimmedString(),
  businessGoal: optionalTrimmedString(),
  conversionGoals: z.array(z.string().trim()).optional(),
  primaryServices: z.array(z.string().trim()).optional(),
  backlinkRules: projectRulesSchema.optional(),
  contentPlaybook: contentPlaybookSchema.optional(),
  nichePlaybook: nichePlaybookSchema.optional(),
  searchConsoleSiteUrl: optionalTrimmedString(255),
  ga4PropertyId: optionalTrimmedString(120),
  cmsProvider: cmsProviderSchema.optional(),
  cmsBaseUrl: optionalUrlString("CMS base URL must be a valid URL."),
  cmsUsername: optionalTrimmedString(120),
  cmsAppPassword: z.string().optional(),
  cmsWebhookUrl: optionalUrlString("CMS webhook URL must be a valid URL."),
  cmsPublishStatus: cmsPublishStatusSchema.optional(),
  notes: optionalTrimmedString(),
  isDefault: z.boolean().optional(),
});
