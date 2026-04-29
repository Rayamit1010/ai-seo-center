import { z } from "zod";
import {
  optionalEmailString,
  optionalTrimmedString,
} from "@/lib/validation/helpers";

export const reportStatusSchema = z.enum(["draft", "ready_to_send", "sent"]);
export const reportFrequencySchema = z.enum(["daily", "weekly", "monthly"]);
export const reportDeliveryModeSchema = z.enum(["email", "draft"]);

export const createReportSchema = z.object({
  title: optionalTrimmedString(160),
  type: z.string().trim().min(1).default("client-seo-report"),
  content: z.record(z.unknown()).optional(),
  auditId: optionalTrimmedString(120),
  clientName: optionalTrimmedString(120),
  projectName: optionalTrimmedString(120),
  recipientEmail: optionalEmailString("Recipient email must be a valid email address."),
});

export const updateReportSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).optional(),
  clientName: optionalTrimmedString(120),
  projectName: optionalTrimmedString(120),
  recipientEmail: optionalEmailString("Recipient email must be a valid email address."),
  status: reportStatusSchema.optional(),
  sentAt: z.string().datetime().nullable().optional(),
  branding: z
    .object({
      accent: optionalTrimmedString(24),
      agencyLabel: optionalTrimmedString(120),
      footerNote: optionalTrimmedString(320),
    })
    .optional(),
});

export const createReportScheduleSchema = z.object({
  auditId: optionalTrimmedString(120),
  targetUrl: z.string().url(),
  clientName: z.string().trim().min(1).max(120),
  projectName: z.string().trim().min(1).max(120),
  recipientEmail: z.string().trim().email(),
  frequency: reportFrequencySchema,
  weekday: z.number().int().min(0).max(6).nullable().optional(),
  monthDay: z.number().int().min(1).max(28).nullable().optional(),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  timezone: optionalTrimmedString(120),
  deliveryMode: reportDeliveryModeSchema.optional(),
});

export const updateReportScheduleSchema = z.object({
  id: z.string().min(1),
  clientName: z.string().trim().min(1).max(120).optional(),
  projectName: z.string().trim().min(1).max(120).optional(),
  recipientEmail: z.string().trim().email().optional(),
  frequency: reportFrequencySchema.optional(),
  weekday: z.number().int().min(0).max(6).nullable().optional(),
  monthDay: z.number().int().min(1).max(28).nullable().optional(),
  hour: z.number().int().min(0).max(23).optional(),
  minute: z.number().int().min(0).max(59).optional(),
  timezone: optionalTrimmedString(120),
  deliveryMode: reportDeliveryModeSchema.optional(),
  isActive: z.boolean().optional(),
});

export const sendReportSchema = z.object({
  reportId: z.string().min(1),
  recipientEmail: optionalEmailString(),
});
