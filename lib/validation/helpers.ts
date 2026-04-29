import { z } from "zod";

export function emptyStringToUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value === "string" && value.trim().length === 0) {
      return undefined;
    }
    return value;
  }, schema.optional());
}

export function optionalTrimmedString(max?: number) {
  let schema = z.string().trim();
  if (max !== undefined) {
    schema = schema.max(max);
  }
  return emptyStringToUndefined(schema);
}

export function optionalUrlString(message = "Please enter a valid URL.") {
  return emptyStringToUndefined(z.string().trim().url(message));
}

export function optionalEmailString(message = "Please enter a valid email address.") {
  return emptyStringToUndefined(z.string().trim().email(message));
}
