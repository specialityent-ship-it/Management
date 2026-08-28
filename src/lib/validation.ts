import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(20)
  .regex(/^[+0-9][0-9\s-]*$/, "Enter a valid phone number");

export const bookingRequestSchema = z.object({
  serviceId: z.string().min(1),
  doctorId: z.string().min(1),
  start: z.iso.datetime(),
  patient: z.object({
    name: z.string().trim().min(2, "Enter the patient's full name").max(120),
    phone: phoneSchema,
    email: z.email().optional().or(z.literal("")),
    gender: z.enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"]).default("UNDISCLOSED"),
    dob: z.iso.date().optional().or(z.literal("")),
    city: z.string().trim().max(80).optional().or(z.literal("")),
  }),
  reason: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  email: z.email().optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  interest: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  source: z
    .enum([
      "WEBSITE_FORM",
      "CHATBOT",
      "INSTAGRAM",
      "YOUTUBE",
      "GOOGLE",
      "WALK_IN",
      "REFERRAL",
      "PHONE",
      "CAMPAIGN",
    ])
    .default("WEBSITE_FORM"),
});

export const chatSchema = z.object({
  sessionKey: z.string().min(8).max(80),
  message: z.string().trim().min(1, "Say something").max(2000),
  visitorName: z.string().trim().max(120).optional(),
  visitorPhone: phoneSchema.optional(),
});

export const socialPostSchema = z.object({
  title: z.string().trim().min(1).max(120),
  caption: z.string().trim().min(1).max(2200),
  hashtags: z.string().trim().max(500).optional().or(z.literal("")),
  mediaUrl: z.url("Enter a public https:// URL to the image or video").optional().or(z.literal("")),
  mediaKind: z.enum(["IMAGE", "VIDEO", "REEL", "SHORT"]).default("IMAGE"),
  platforms: z.array(z.enum(["INSTAGRAM", "YOUTUBE"])).min(1, "Pick at least one platform"),
  scheduledAt: z.iso.datetime().optional().or(z.literal("")),
});

export const otCaseSchema = z.object({
  patientId: z.string().min(1),
  surgeonId: z.string().min(1),
  serviceId: z.string().min(1),
  theatreId: z.string().optional().or(z.literal("")),
  scheduledStart: z.iso.datetime(),
  durationMin: z.coerce.number().int().min(15).max(720),
  anaesthesia: z.enum(["LOCAL", "REGIONAL", "GENERAL", "SEDATION"]).default("LOCAL"),
  anaesthetist: z.string().trim().max(120).optional().or(z.literal("")),
  assistants: z.string().trim().max(240).optional().or(z.literal("")),
  procedureNote: z.string().trim().max(4000).optional().or(z.literal("")),
});

// ---------------------------------------------------------------------------
// Admin content management
// ---------------------------------------------------------------------------

/// Fees are entered in rupees by staff and stored as paise, so the form never
/// asks anyone to think in minor units.
const rupees = z.coerce
  .number()
  .min(0, "Cannot be negative")
  .max(10_000_000, "That looks too large")
  .transform((value) => Math.round(value * 100));

export const doctorSchema = z.object({
  name: z.string().trim().min(2, "Enter the doctor's name").max(120),
  slug: z.string().trim().max(80).optional().or(z.literal("")),
  qualifications: z.string().trim().min(1, "Enter qualifications").max(160),
  specialty: z.string().trim().min(1, "Enter a specialty").max(120),
  bio: z.string().trim().max(4000).optional().or(z.literal("")),
  photoUrl: z.url("Enter a valid https:// URL").optional().or(z.literal("")),
  regNumber: z.string().trim().max(60).optional().or(z.literal("")),
  yearsExp: z.coerce.number().int().min(0).max(80).default(0),
  consultFee: rupees.default(0),
  active: z.coerce.boolean().default(true),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Enter a service name").max(120),
  slug: z.string().trim().max(80).optional().or(z.literal("")),
  kind: z.enum(["OPD", "OT", "DIAGNOSTIC", "TELECONSULT"]).default("OPD"),
  description: z.string().trim().min(1, "Describe the service").max(4000),
  durationMin: z.coerce.number().int().min(5, "At least 5 minutes").max(720),
  priceMinor: rupees.default(0),
  depositMinor: rupees.default(0),
  requiresDeposit: z.coerce.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0).max(9999).default(100),
  active: z.coerce.boolean().default(true),
  doctorIds: z.array(z.string()).default([]),
});

export const availabilitySchema = z
  .object({
    doctorId: z.string().min(1),
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startMinute: z.coerce.number().int().min(0).max(1439),
    endMinute: z.coerce.number().int().min(1).max(1440),
    slotMin: z.coerce.number().int().min(5).max(240).default(15),
  })
  .refine((v) => v.endMinute > v.startMinute, {
    message: "The end time must be after the start time",
    path: ["endMinute"],
  });

export const timeOffSchema = z
  .object({
    doctorId: z.string().min(1),
    start: z.iso.datetime(),
    end: z.iso.datetime(),
    reason: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine((v) => new Date(v.end) > new Date(v.start), {
    message: "The end must be after the start",
    path: ["end"],
  });

export const staffSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(120),
  email: z.email("Enter a valid email"),
  password: z.string().min(12, "Use at least 12 characters").max(200),
  role: z.enum(["ADMIN", "DOCTOR", "RECEPTION", "OT_COORDINATOR", "MARKETING"]).default("RECEPTION"),
});
