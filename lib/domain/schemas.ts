import { z } from 'zod';

export const GuestSessionSchema = z.object({
  sessionId: z.string().uuid(),
  createdAt: z.string().datetime(),
  lastActive: z.string().datetime(),
  analyticsConsent: z.boolean().default(false),
});

export type GuestSession = z.infer<typeof GuestSessionSchema>;

export const SourceRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  provider: z.string(),
  verifiedAt: z.string(),
  freshUntil: z.string(),
  attributionUrl: z.string().url().optional(),
  confidence: z.enum(['verified', 'estimate', 'indicative']),
  isLive: z.boolean().default(false)
});

export type SourceRecord = z.infer<typeof SourceRecordSchema>;

export const CostEstimateSchema = z.object({
  currency: z.literal('INR'),
  stayAndTaxes: z.string(),
  transfers: z.string(),
  foodAndSpends: z.string(),
  totalRange: z.string(),
  isEstimate: z.literal(true),
  disclaimer: z.string()
});

export type CostEstimate = z.infer<typeof CostEstimateSchema>;

export const ItineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(30),
  phase: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  roadTravelMinutes: z.number().int().nonnegative().optional(),
  effortLevel: z.enum(['easy', 'moderate', 'active']).default('easy'),
  extraOption: z.object({
    heading: z.string(),
    description: z.string(),
    suggestedPrompt: z.string()
  }).optional()
});

export type ItineraryDay = z.infer<typeof ItineraryDaySchema>;

export const FitReasonSchema = z.object({
  number: z.string(),
  title: z.string(),
  description: z.string(),
  evidenceLabel: z.string()
});

export type FitReason = z.infer<typeof FitReasonSchema>;

export const TripSchema = z.object({
  id: z.string(),
  version: z.number().int().default(1),
  routeKey: z.string(),
  name: z.string(),
  title: z.string(),
  stops: z.string(),
  image: z.string(),
  match: z.string(),
  summary: z.string(),
  days: z.array(ItineraryDaySchema),
  fitReasons: z.array(FitReasonSchema),
  budget: CostEstimateSchema,
  sources: z.array(SourceRecordSchema).default([])
});

export type Trip = z.infer<typeof TripSchema>;

export const TripBriefSchema = z.object({
  prompt: z.string().max(1000).optional(),
  origin: z.string().min(2),
  when: z.string(),
  party: z.string(),
  duration: z.string(),
  budget: z.string(),
  interests: z.array(z.string()),
  accessibility: z.array(z.string()).default([]),
  routeKey: z.string()
});

export type TripBrief = z.infer<typeof TripBriefSchema>;

export const PartnerOfferSchema = z.object({
  partnerId: z.string(),
  category: z.enum(['food', 'outdoors', 'culture', 'family']),
  name: z.string(),
  specialty: z.string(),
  offerState: z.enum(['suggestion', 'partner_offer', 'handoff_ready']).default('suggestion'),
  isVerified: z.literal(false), // Prototype rule: Never fabricate verification badges
  disclaimer: z.string()
});

export type PartnerOffer = z.infer<typeof PartnerOfferSchema>;
