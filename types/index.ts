export interface TripBrief {
  prompt?: string;
  origin: string;
  when: string;
  party: string;
  duration: string;
  budget: string;
  interests: string[];
  accessibility: string[];
  routeKey: string;
}

export interface DayActivity {
  dayNumber: number;
  phase: string;
  title: string;
  description: string;
  tags: string[];
  extraOption?: {
    heading: string;
    description: string;
    suggestedPrompt: string;
  };
}

export interface FitReason {
  number: string;
  title: string;
  description: string;
  evidenceLabel: string;
}

export interface BudgetShape {
  currency: 'INR';
  stayAndTaxes: string;
  transfers: string;
  foodAndSpends: string;
  totalRange: string;
  notes: string;
  isEstimate: true;
}

export interface RouteDetail {
  id: string;
  name: string;
  title: string;
  stops: string;
  image: string;
  match: string;
  summary: string;
  days: DayActivity[];
  fitReasons: FitReason[];
  budget: BudgetShape;
  pins: Array<{ name: string; className: string }>;
}

export interface PartnerCategory {
  id: string;
  label: string;
  title: string;
  description: string;
  image: string;
  interest: string;
}

export interface SavedTrip {
  id: string;
  title: string;
  origin: string;
  duration: string;
  budget: string;
  image: string;
  updated: string;
}
