import {
  PortalRole,
  NextStepAction,
  PortalConversation,
  TravelPassData,
  PartnerInquiry,
  AdminPartnerReview,
  PortalNotification,
  AlignmentQuestion,
  VayuAlignmentScore,
  TravelJournalEntry,
  TravelCohort,
  LocalImpactLedger
} from '@/types/portal';
import { routeData } from '@/lib/mock-routes';

// Mock storage stores for Portal
let conversationsStore: PortalConversation[] = [
  {
    id: 'conv-sohra-01',
    partnerId: 'partner-sohra',
    partnerName: 'Sohra Indigenous Stays Collective',
    partnerCategory: 'Homestay & Village Eco-Tours',
    partnerImage: '/images/categories/exp-trails.jpg',
    travelerName: 'Aarav Sharma',
    travelerEmail: 'aarav.traveler@example.com',
    subject: 'Quiet 5-day cottage stay near Sohra valley',
    lastMessageSnippet: 'Yes, we have step-free ground floor cottages with valley view.',
    lastMessageAt: '2026-10-18T14:30:00Z',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-1',
        sender: 'traveler',
        text: 'Hello! We are planning a 5-day trip from Mumbai in October. Does your homestay have step-free access for my mother?',
        sentAt: '2026-10-18T10:15:00Z'
      },
      {
        id: 'msg-2',
        sender: 'partner',
        text: 'Khublei! Yes, we have two step-free ground floor cottages with uninterrupted valley views, and private vehicle parking right at the door.',
        sentAt: '2026-10-18T11:40:00Z'
      },
      {
        id: 'msg-3',
        sender: 'partner',
        text: 'I have attached our local seasonal meal menu featuring fresh organic farm vegetables.',
        sentAt: '2026-10-18T14:30:00Z'
      }
    ]
  },
  {
    id: 'conv-kochi-02',
    partnerId: 'partner-kochi',
    partnerName: 'Fort Kochi Heritage Walks',
    partnerCategory: 'Food & Cultural Host',
    partnerImage: '/images/categories/exp-food.jpg',
    travelerName: 'Aarav Sharma',
    travelerEmail: 'aarav.traveler@example.com',
    subject: 'Traditional Kerala spice market walk',
    lastMessageSnippet: 'Morning 8:00 AM is best before the sun gets strong.',
    lastMessageAt: '2026-10-17T16:20:00Z',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-101',
        sender: 'traveler',
        text: 'Hi, which timing do you suggest for the heritage spice walk?',
        sentAt: '2026-10-17T15:00:00Z'
      },
      {
        id: 'msg-102',
        sender: 'partner',
        text: 'Morning 8:00 AM is best before the sun gets strong. We end with traditional Appam and stew at a heritage café.',
        sentAt: '2026-10-17T16:20:00Z'
      }
    ]
  }
];

let partnerInquiriesStore: PartnerInquiry[] = [
  {
    id: 'inq-101',
    travelerName: 'Priya & Rohan Desai',
    origin: 'Bengaluru',
    destination: 'Meghalaya (Shillong & Sohra)',
    dates: 'Nov 12 – Nov 17, 2026',
    party: 'Two of us',
    specialRequests: ['Vegetarian food only', 'Slow pace with photography stops', 'Direct vehicle access'],
    status: 'new',
    submittedAt: '2026-10-18T09:00:00Z'
  },
  {
    id: 'inq-102',
    travelerName: 'Vikram Malhotra',
    origin: 'Delhi',
    destination: 'Meghalaya',
    dates: 'Dec 02 – Dec 07, 2026',
    party: 'Family with elders',
    specialRequests: ['Limited walking', 'Heated rooms if possible'],
    status: 'quoted',
    quoteINR: 34500,
    quoteNotes: 'Includes 5 nights stay in ground floor suite, daily vegetarian breakfast, and verified local driver.',
    submittedAt: '2026-10-17T11:30:00Z'
  }
];

let adminPartnersStore: AdminPartnerReview[] = [
  {
    id: 'partner-megh-01',
    name: 'Sohra Indigenous Stays Collective',
    category: 'outdoors',
    region: 'Meghalaya (Cherrapunji & Pynursla)',
    contactPerson: 'Banteilang Marbaniang',
    phone: '+91 98620 XXXXX',
    licenseNumber: 'MEGH-TOUR-2024-884',
    verificationStatus: 'verified',
    submittedAt: '2026-08-15T10:00:00Z'
  },
  {
    id: 'partner-ladakh-02',
    name: 'Sham Valley Community Eco-Guides',
    category: 'outdoors',
    region: 'Ladakh (Leh & Alchi)',
    contactPerson: 'Tsering Dorjay',
    phone: '+91 94191 XXXXX',
    licenseNumber: 'LDK-GUIDE-2025-112',
    verificationStatus: 'pending',
    submittedAt: '2026-10-16T12:00:00Z'
  },
  {
    id: 'partner-rajasthan-03',
    name: 'Pink City Artisan Guild',
    category: 'culture',
    region: 'Rajasthan (Jaipur Old Bazaars)',
    contactPerson: 'Kailash Meena',
    phone: '+91 98290 XXXXX',
    licenseNumber: 'RAJ-HERITAGE-773',
    verificationStatus: 'pending',
    submittedAt: '2026-10-17T08:30:00Z'
  }
];

export function getNextStepForTraveler(routeKey = 'meghalaya'): NextStepAction {
  if (routeKey === 'ladakh') {
    return {
      id: 'ns-ladakh',
      badge: 'HEALTH & ALTITUDE',
      title: 'Review 48-Hour Acclimatisation Routine',
      description: 'Your trip to Leh involves sudden 3,500m elevation. Day 1 and 2 must remain completely restful before road passes.',
      ctaText: 'View Altitude Protocol ↗',
      ctaAction: 'vayu_advice',
      urgency: 'high',
      icon: '🏔️'
    };
  }
  if (routeKey === 'kerala') {
    return {
      id: 'ns-kerala',
      badge: 'WATER TRANSIT CHECK',
      title: 'Confirm Backwater Country Canoe Window',
      description: 'Morning water transfers between Marari and Alleppey operate best between 7:30 AM and 10:00 AM.',
      ctaText: 'Consult Local Host ↗',
      ctaAction: 'open_messages',
      urgency: 'info',
      icon: '🛶'
    };
  }
  return {
    id: 'ns-meghalaya',
    badge: 'ROAD PACING NOTE',
    title: 'Verify Guwahati Highway Transfer Window',
    description: 'Guwahati to Shillong road work slows evening traffic. We recommend leaving Guwahati Airport before 1:30 PM.',
    ctaText: 'Open Pacing Planner ↗',
    ctaAction: 'open_trips',
    urgency: 'medium',
    icon: '🚙'
  };
}

export function getTravelPass(routeKey = 'meghalaya', origin = 'Mumbai'): TravelPassData {
  const route = routeData[routeKey] || routeData.meghalaya;

  return {
    passId: `VP-${routeKey.toUpperCase()}-2026`,
    tripId: route.id,
    destination: `${route.name} (${route.stops})`,
    duration: '5 Days / 4 Nights',
    pacing: 'Pacing-First · Unhurried with 1 Base Move',
    dates: 'Flexible Target · Autumn Season',
    origin,
    travellers: '2 Travellers (Standard Party)',
    itinerarySummary: route.days.map((d) => ({
      day: d.dayNumber,
      title: d.title,
      focus: d.phase,
      bufferAdvice: d.extraOption?.description || 'Confirm current local road conditions before departure.'
    })),
    packingList: [
      { item: 'Layered light woollens & windproof rain jacket', category: 'clothing', checked: false },
      { item: 'Comfortable walking shoes with good tread grip', category: 'clothing', checked: false },
      { item: 'Government photo IDs (Aadhaar / Voter ID / Passport)', category: 'documents', checked: true },
      { item: 'Basic first-aid, motion sickness & personal medication', category: 'health_safety', checked: false },
      { item: 'Offline downloaded maps & printed emergency pass', category: 'essentials', checked: true },
      { item: 'Cash reserve for small village stalls & road tolls', category: 'essentials', checked: false }
    ],
    emergencyContacts: [
      { title: 'Local Tourist Police Assistance', contact: '112 / +91 364 2222214', type: 'local_police' },
      { title: 'District Civil Hospital Emergency', contact: '+91 364 2224420', type: 'medical' },
      { title: 'State Highway Roadside Assistance', contact: '1033', type: 'road_help' }
    ]
  };
}

export function getConversations(): PortalConversation[] {
  return conversationsStore;
}

export function addMessageToConversation(convId: string, text: string, sender: 'traveler' | 'partner'): PortalConversation | null {
  const conv = conversationsStore.find((c) => c.id === convId);
  if (!conv) return null;

  const newMsg = {
    id: `msg-${Date.now()}`,
    sender,
    text,
    sentAt: new Date().toISOString()
  };

  conv.messages.push(newMsg);
  conv.lastMessageSnippet = text;
  conv.lastMessageAt = newMsg.sentAt;
  if (sender === 'partner') {
    conv.unreadCount += 1;
  }
  return conv;
}

export function getPartnerInquiries(): PartnerInquiry[] {
  return partnerInquiriesStore;
}

export function submitPartnerQuote(inquiryId: string, quoteINR: number, quoteNotes: string): PartnerInquiry | null {
  const inq = partnerInquiriesStore.find((i) => i.id === inquiryId);
  if (!inq) return null;

  inq.status = 'quoted';
  inq.quoteINR = quoteINR;
  inq.quoteNotes = quoteNotes;
  return inq;
}

export function getAdminPartners(): AdminPartnerReview[] {
  return adminPartnersStore;
}

export function reviewAdminPartner(partnerId: string, status: 'verified' | 'rejected', reason?: string): AdminPartnerReview | null {
  const partner = adminPartnersStore.find((p) => p.id === partnerId);
  if (!partner) return null;

  partner.verificationStatus = status;
  if (reason) partner.rejectionReason = reason;
  return partner;
}

// ── NOTIFICATIONS STORE ──
let notificationsStore: PortalNotification[] = [
  {
    id: 'notif-1',
    category: 'transit',
    urgency: 'warning',
    title: 'Guwahati - Shillong Highway Widening',
    message: 'Road widening work near Umiam lake creates evening crawling traffic (4:00 PM – 7:00 PM). Allow 1 hr buffer for airport transfers.',
    timestamp: '2026-10-18T15:00:00Z',
    isRead: false,
    actionTab: 'trips',
    actionText: 'Inspect Day Pacing'
  },
  {
    id: 'notif-2',
    category: 'host',
    urgency: 'info',
    title: 'Sohra Indigenous Stays Collective',
    message: 'Host Banteilang Marbaniang responded to your query regarding step-free access and shared seasonal wild-pepper broth menu.',
    timestamp: '2026-10-18T14:30:00Z',
    isRead: false,
    actionTab: 'messages',
    actionText: 'Open Conversation'
  },
  {
    id: 'notif-3',
    category: 'weather',
    urgency: 'info',
    title: 'Golden Autumn Visibility across Cherrapunji',
    message: 'Low-mist forecast for days 2 & 3. Clear visibility over Nohkalikai falls and Seven Sisters gorges expected until 3:30 PM daily.',
    timestamp: '2026-10-18T11:00:00Z',
    isRead: true,
    actionTab: 'overview',
    actionText: 'View Weather Notes'
  },
  {
    id: 'notif-4',
    category: 'pacing',
    urgency: 'warning',
    title: 'Vayu Pacing Alignment Recommendation',
    message: 'Your party includes elders or slow-pace preference. Complete our 2-minute rhythm interview to auto-calibrate road rest stops.',
    timestamp: '2026-10-17T09:00:00Z',
    isRead: false,
    actionTab: 'alignment',
    actionText: 'Open Alignment Studio'
  }
];

export function getNotifications(): PortalNotification[] {
  return [...notificationsStore];
}

export function markNotificationAsRead(id: string): PortalNotification | null {
  const notif = notificationsStore.find((n) => n.id === id);
  if (!notif) return null;
  notif.isRead = true;
  return notif;
}

export function markAllNotificationsAsRead(): void {
  notificationsStore.forEach((n) => {
    n.isRead = true;
  });
}

export function getUnreadNotificationCount(): number {
  return notificationsStore.filter((n) => !n.isRead).length;
}

// ── VAYU ALIGNMENT STUDIO ──
export function getAlignmentQuestions(): AlignmentQuestion[] {
  return [
    {
      id: 'q-daily-rhythm',
      step: 1,
      question: 'What is your preferred daily morning start & rhythm?',
      subtitle: 'Determines whether we plan sunrise mountain lookouts or slow morning veranda teas.',
      options: [
        {
          id: 'opt-morning-mist',
          label: 'Sunrise & Early Birds (6:30 – 7:30 AM)',
          description: 'Best for misty waterfalls, quiet temple bells, and escaping highway traffic.',
          pacingDelta: 0,
          rhythmKeyword: 'Dawn Exploratory'
        },
        {
          id: 'opt-slow-tea',
          label: 'Unhurried Breakfast & Slow Starts (9:30 – 10:30 AM)',
          description: 'Long tea/coffee mornings, book reading, zero clock pressure before departure.',
          pacingDelta: 25,
          rhythmKeyword: 'Gentle Veranda'
        },
        {
          id: 'opt-twilight',
          label: 'Mid-Day Rest with Twilight & Stargazing',
          description: 'Siesta after lunch, followed by late afternoon walks and clear starry nights.',
          pacingDelta: 15,
          rhythmKeyword: 'Twilight Serene'
        }
      ]
    },
    {
      id: 'q-road-endurance',
      step: 2,
      question: 'What is your comfortable maximum road driving window in a day?',
      subtitle: 'Mountain ghats and winding turns fatigue travelers differently than expressway miles.',
      options: [
        {
          id: 'opt-short-legs',
          label: 'Maximum 2 to 2.5 hours driving per day',
          description: 'Frequent scenic viewpoints, local tea shack breaks every 45 minutes.',
          pacingDelta: 30,
          rhythmKeyword: 'Short Scenic Legs'
        },
        {
          id: 'opt-moderate-legs',
          label: 'Comfortable with 3.5 to 5 hours winding road',
          description: 'Allows crossing deeper passes to reach quiet, untouched tribal hamlets.',
          pacingDelta: 0,
          rhythmKeyword: 'Balanced Distance'
        },
        {
          id: 'opt-hub-spoke',
          label: 'One long transit day to stay 3+ nights at a single base',
          description: 'Zero daily luggage packing; explore surrounding radius at leisure.',
          pacingDelta: 15,
          rhythmKeyword: 'Single Base Anchor'
        }
      ]
    },
    {
      id: 'q-culinary-style',
      step: 3,
      question: 'How do you like to experience food during journeys?',
      subtitle: 'Helps us guide you toward vetted village kitchens or reliable mild comfort stops.',
      options: [
        {
          id: 'opt-hearth',
          label: 'Deep indigenous food & hearth-to-plate dining',
          description: 'Seasonal wild greens, bamboo shoot infusions, local family kitchen tables.',
          pacingDelta: 10,
          rhythmKeyword: 'Indigenous Hearth'
        },
        {
          id: 'opt-mild-comfort',
          label: 'Familiar Indian comfort meals (mild, wholesome)',
          description: 'Dal, rotis, rice, vegetable stews, gentle seasonal preparations.',
          pacingDelta: 0,
          rhythmKeyword: 'Classic Comfort'
        },
        {
          id: 'opt-strict-veg',
          label: 'Strict vegetarian or Jain requirements',
          description: 'Separate kitchen vessels, zero alliums/eggs, verified pure-veg hosts.',
          pacingDelta: 5,
          rhythmKeyword: 'Strict Vegetarian'
        }
      ]
    },
    {
      id: 'q-physical-terrain',
      step: 4,
      question: 'What is your party’s walking and elevation comfort?',
      subtitle: 'Critical for selecting step-free viewpoints vs cliff-side suspension trails.',
      options: [
        {
          id: 'opt-step-free',
          label: 'Step-free, gentle paved paths, car-adjacent viewpoints',
          description: 'Suited for seniors, young toddlers, or travelers needing gentle terrain.',
          pacingDelta: 25,
          rhythmKeyword: 'Accessible Viewpoints'
        },
        {
          id: 'opt-forest-paths',
          label: 'Moderate nature walks (3 to 5 km shaded dirt paths)',
          description: 'Mild incline, bamboo bridges, small stream crossings with sturdy shoes.',
          pacingDelta: 0,
          rhythmKeyword: 'Moderate Forest Path'
        },
        {
          id: 'opt-trekker',
          label: 'Active hill scrambles & multi-tier waterfall descents',
          description: '3,000+ stone steps, living root bridge river gorges, unpaved terrain.',
          pacingDelta: -10,
          rhythmKeyword: 'Active Trail'
        }
      ]
    }
  ];
}

export function calculateAlignment(answers: Record<string, string>): VayuAlignmentScore {
  const questions = getAlignmentQuestions();
  let totalDelta = 0;
  const keywords: string[] = [];

  questions.forEach((q) => {
    const selectedOptId = answers[q.id];
    const option = q.options.find((o) => o.id === selectedOptId) || q.options[0];
    totalDelta += option.pacingDelta;
    keywords.push(option.rhythmKeyword);
  });

  // Calculate buffer factor: base 1.0 + delta / 100
  const bufferFactor = Number((1.0 + Math.max(0, totalDelta) / 100).toFixed(2));
  const score = Math.min(98, Math.max(82, 85 + Math.round(totalDelta / 5)));

  const recommendedAdjustments: string[] = [];
  if (totalDelta >= 40) {
    recommendedAdjustments.push('Enforce 90-minute road buffers between major valley legs');
    recommendedAdjustments.push('Cap active sightseeing to 1 major morning highlight per day');
    recommendedAdjustments.push('Schedule daily 2-hour afternoon rest window at homestay veranda');
  } else if (totalDelta >= 20) {
    recommendedAdjustments.push('Add 45-minute scenic tea stop along Umiam & Sohra highway');
    recommendedAdjustments.push('Shift departure times to 9:30 AM to avoid morning chilly fog');
    recommendedAdjustments.push('Keep Day 3 completely open for village handicrafts & local walks');
  } else {
    recommendedAdjustments.push('Early 7:00 AM start recommended to catch crystal-clear waterfall reflections');
    recommendedAdjustments.push('Combine afternoon village walk with evening river sunset');
  }

  return {
    score,
    rhythmTitle: `${keywords[0]} & ${keywords[1]} Rhythm`,
    pacingSummary: `Calibrated with a ${Math.round((bufferFactor - 1) * 100)}% extra safety buffer across road transfers and daily itineraries.`,
    bufferFactor,
    recommendedAdjustments,
    recalibratedAt: new Date().toISOString()
  };
}

// ── TRAVEL JOURNAL STORE ──
let travelJournalStore: TravelJournalEntry[] = [
  {
    id: 'entry-1',
    day: 1,
    date: 'Autumn Day 1',
    title: 'Arrival in the Clouds & First Pine-Honey Tea',
    location: 'Guwahati to Shillong Ridge',
    reflection: 'The air turned cool and scented with damp pine needle resin as soon as we crossed Jorabat. We took the old scenic loop around Umiam lake where fishermen were casting nets into calm silver water.',
    highlight: 'Warm ginger & wild honeycomb tea at a small roadside bamboo stall overlooking the reservoir.',
    localInteraction: 'Spoke with Bah John, who told us the autumn mist usually lifts around 10:30 AM and returns at dusk.',
    photoUrl: '/images/destinations/meghalaya.jpg',
    weatherCondition: '21°C · Soft Valley Fog'
  },
  {
    id: 'entry-2',
    day: 2,
    date: 'Autumn Day 2',
    title: 'Living Bio-Architecture of the Southern Slopes',
    location: 'Tyrna & Nongriat Gorge',
    reflection: 'Seeing roots woven across the river by five generations of Khasi elders changes how you view time. Nothing was rushed here; the bridge grew slowly into stone fissures over eighty years.',
    highlight: 'Cooling feet in turquoise limestone pools underneath the double-decker root bridge.',
    localInteraction: 'Kong Mary shared steamed sticky rice wrapped in banana leaf with fresh ground wild coriander paste.',
    photoUrl: '/images/categories/exp-trails.jpg',
    weatherCondition: '23°C · Crisp Sun'
  }
];

export function getJournalEntries(): TravelJournalEntry[] {
  return [...travelJournalStore];
}

export function addJournalEntry(entry: Omit<TravelJournalEntry, 'id'>): TravelJournalEntry {
  const newEntry: TravelJournalEntry = {
    ...entry,
    id: `entry-${Date.now()}`
  };
  travelJournalStore.unshift(newEntry);
  return newEntry;
}

// ── SMALL-GROUP COHORTS STORE ──
let travelCohortsStore: TravelCohort[] = [
  {
    id: 'cohort-megh-01',
    destination: 'Meghalaya',
    routeKey: 'meghalaya',
    title: 'Living Root Trails & Cloud Valleys Cohort',
    dates: 'Nov 14 – Nov 19, 2026',
    groupSize: 'Small Group (Max 6 Travellers)',
    totalSeats: 6,
    availableSeats: 2,
    hostName: 'Sohra Indigenous Stays Collective',
    hostCategory: 'Verified Eco-Homestay Host',
    hostImage: '/images/categories/exp-trails.jpg',
    focus: 'Slow village immersion, Khasi bio-engineering, sacred groves & canyon overlooks.',
    estimatedCostINR: 36500,
    highlights: [
      'Shared private 4x4 high-clearance vehicle for comfortable transit',
      'Step-free ground floor cottages with panoramic valley views',
      'Guided sacred forest walk with village conservation custodian',
      'Traditional hearth-cooked dinner featuring wild foraged herbs'
    ],
    status: 'almost_full'
  },
  {
    id: 'cohort-kerala-02',
    destination: 'Kerala',
    routeKey: 'kerala',
    title: 'Backwater Country & Spice Guild Cohort',
    dates: 'Dec 05 – Dec 10, 2026',
    groupSize: 'Small Group (Max 8 Travellers)',
    totalSeats: 8,
    availableSeats: 3,
    hostName: 'Fort Kochi Heritage Walks & Waterways',
    hostCategory: 'Verified Cultural Partner',
    hostImage: '/images/categories/exp-food.jpg',
    focus: 'Quiet country canoes, historic spice trading quarters, coastal backwaters.',
    estimatedCostINR: 34000,
    highlights: [
      'Electric & solar-assisted country boats on narrow canals',
      'Traditional sadhya feast served on plantain leaves',
      'Heritage artisan workshops in Mattancherry and Fort Kochi',
      'Sunset kayak session through quiet mangrove waterways'
    ],
    status: 'open'
  },
  {
    id: 'cohort-ladakh-03',
    destination: 'Ladakh',
    routeKey: 'ladakh',
    title: 'Sham Valley 48-Hour Acclimatisation Cohort',
    dates: 'Jun 18 – Jun 24, 2027',
    groupSize: 'Small Group (Max 6 Travellers)',
    totalSeats: 6,
    availableSeats: 1,
    hostName: 'Sham Valley Community Eco-Guides',
    hostCategory: 'High-Altitude Safety Certified',
    hostImage: '/images/destinations/ladakh.jpg',
    focus: 'Altitude-gentle progression, 11th-century monastic frescoes, organic apricot orchards.',
    estimatedCostINR: 48500,
    highlights: [
      'Dedicated pulse oximeters and portable oxygen on board',
      'Strict 48-hour rest protocol in Leh garden guesthouse',
      'Day walks in lower Sham valley (Alchi & Likir)',
      'Solar-heated traditional mud-brick family homestays'
    ],
    status: 'almost_full'
  }
];

export function getCohorts(): TravelCohort[] {
  return [...travelCohortsStore];
}

export function requestJoinCohort(cohortId: string, travelerName: string, travelerEmail: string, note?: string): boolean {
  const cohort = travelCohortsStore.find((c) => c.id === cohortId);
  if (!cohort || cohort.availableSeats <= 0) return false;

  cohort.availableSeats -= 1;
  if (cohort.availableSeats === 0) {
    cohort.status = 'waitlist';
  }

  // Also create a partner inquiry entry so the host sees it in their queue!
  partnerInquiriesStore.unshift({
    id: `inq-cohort-${Date.now()}`,
    travelerName,
    origin: 'Portal Traveler',
    destination: cohort.destination,
    dates: cohort.dates,
    party: '1 Traveller (Cohort Booking Request)',
    specialRequests: [
      `Cohort Title: ${cohort.title}`,
      `Contact Email: ${travelerEmail}`,
      note || 'Requested seat in small-group cohort.'
    ],
    status: 'new',
    submittedAt: new Date().toISOString()
  });

  return true;
}

// ── LOCAL IMPACT LEDGER ──
export function getLocalImpactLedger(routeKey = 'meghalaya'): LocalImpactLedger {
  if (routeKey === 'ladakh') {
    return {
      routeKey: 'ladakh',
      destinationName: 'Ladakh High Valleys',
      localSpendRetentionPercent: 92,
      treesOffsetEstimated: 19,
      plasticAvoidedKg: 24,
      partnerVillagesSupported: ['Alchi', 'Turtuk', 'Hemis Shukpachan'],
      communityPledge: 'Zero bottled water initiative supported by UV refill points; 92% of your stay fee goes directly to local Ladakhi family hosts.'
    };
  }
  if (routeKey === 'kerala') {
    return {
      routeKey: 'kerala',
      destinationName: 'Kerala Backwaters & Malabar Coast',
      localSpendRetentionPercent: 86,
      treesOffsetEstimated: 12,
      plasticAvoidedKg: 15,
      partnerVillagesSupported: ['Kumarakom', 'Mararikulam', 'Chendamangalam'],
      communityPledge: 'Handloom guild support and solar canoe operators; 86% of dining and activity expenditure directly sustains village artisans.'
    };
  }
  return {
    routeKey: 'meghalaya',
    destinationName: 'Meghalaya Cloud Valleys',
    localSpendRetentionPercent: 88,
    treesOffsetEstimated: 14,
    plasticAvoidedKg: 18,
    partnerVillagesSupported: ['Sohra', 'Tyrna', 'Mawlynnong', 'Nongriat'],
    communityPledge: 'Community forest restoration levy included in homestay fee; 88% of travel expenditure is paid directly to Khasi homestay owners and village guides.'
  };
}
