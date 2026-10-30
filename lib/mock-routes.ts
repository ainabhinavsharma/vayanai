import { RouteDetail, PartnerCategory } from '@/types';

export const routeData: Record<string, RouteDetail> = {
  meghalaya: {
    id: 'meghalaya',
    name: 'Meghalaya',
    title: 'Meghalaya, with room to breathe.',
    stops: 'Shillong & Sohra',
    image: '/images/destinations/meghalaya.jpg',
    match: 'EASY PACE · NATURE · FIVE DAYS',
    summary: 'A gentle loop from Guwahati to Shillong and Sohra, with a slower first day and choices for the more active ones.',
    pins: [
      { name: 'GUWAHATI', className: 'pin-a' },
      { name: 'SHILLONG', className: 'pin-b' },
      { name: 'SOHRA', className: 'pin-c' }
    ],
    days: [
      {
        dayNumber: 1,
        phase: 'ARRIVE & SETTLE',
        title: 'Guwahati to Shillong',
        description: 'Arrive, take the road to Shillong, and keep the evening free. A slow landing helps the rest of the trip feel less rushed.',
        tags: ['Transfer day', 'Easy evening', 'Road time to verify'],
        extraOption: {
          heading: 'A gentler option',
          description: 'Stay near your arrival point if the flight comes in late. Confirm transfer time and conditions close to travel.',
          suggestedPrompt: 'Could day one be even easier?'
        }
      },
      {
        dayNumber: 2,
        phase: 'SHILLONG, SLOWLY',
        title: 'A little city, then an open afternoon',
        description: 'Pick one neighbourhood or viewpoint, then leave the rest of the day loose for a café, a market, or a much-needed nap.',
        tags: ['Choose one stop', 'Food & local life'],
        extraOption: {
          heading: 'Choose your energy',
          description: 'Low-key: keep the afternoon near your stay. More active: add a short local walk after checking the weather.',
          suggestedPrompt: 'Give me a more active option for day two.'
        }
      },
      {
        dayNumber: 3,
        phase: 'THE ROAD TO SOHRA',
        title: 'Take the scenic route south',
        description: 'Pause at one or two viewpoints on the way. Keep the stops flexible rather than turning the drive into a checklist.',
        tags: ['Scenic transfer', 'Rain can change the plan'],
        extraOption: {
          heading: 'Worth checking before you go',
          description: 'Road and weather conditions can change. Leave buffer time and confirm current local advice before setting out.',
          suggestedPrompt: 'What should I check before the drive to Sohra?'
        }
      },
      {
        dayNumber: 4,
        phase: 'YOUR KIND OF OUTDOORS',
        title: 'Choose a walk—or choose not to',
        description: 'Make this the flexible day: an easy viewpoint option or a longer guided walk, depending on conditions and how you feel.',
        tags: ['Optional activity', 'Effort varies', 'Local guide may help'],
        extraOption: {
          heading: 'Accessibility note',
          description: 'Some popular trails have many uneven steps. Check current route details and match the walk to everyone in your group.',
          suggestedPrompt: 'Suggest a lower-effort day four.'
        }
      },
      {
        dayNumber: 5,
        phase: 'RETURN WITH A BUFFER',
        title: 'Sohra back to Guwahati',
        description: 'Keep the final transfer unhurried and allow a sensible buffer before your onward journey.',
        tags: ['Transfer day', 'Check departure time'],
        extraOption: {
          heading: 'Protect your connection',
          description: 'Match the return transfer to your actual departure time and leave extra room for road delays.',
          suggestedPrompt: 'Help me think through the return transfer.'
        }
      }
    ],
    fitReasons: [
      {
        number: '01',
        title: 'Green is the main event',
        description: 'The route centres on Meghalaya’s landscape rather than stacking unrelated stops.',
        evidenceLabel: 'MATCHED TO: NATURE'
      },
      {
        number: '02',
        title: 'Room for a softer pace',
        description: 'Only one main move between bases. Days include open space and optional activity.',
        evidenceLabel: 'MATCHED TO: EASY PACE'
      },
      {
        number: '03',
        title: 'Travel time is visible',
        description: 'The longer road transfers are called out so they can be weighed before dates are fixed.',
        evidenceLabel: 'ROUTE ESTIMATE · VERIFY BEFORE TRAVEL'
      },
      {
        number: '04',
        title: 'It can bend around your group',
        description: 'Choose gentler alternatives, check accessibility, or move the balance toward outdoors.',
        evidenceLabel: 'EDITABLE BY YOU'
      }
    ],
    budget: {
      currency: 'INR',
      stayAndTaxes: '₹18k–32k',
      transfers: '₹8k–15k',
      foodAndSpends: '₹5k–9k',
      totalRange: '₹31k–56k',
      notes: 'Planning shape · Flights / trains not included. Fictional placeholder for preview mode.',
      isEstimate: true
    }
  },
  ladakh: {
    id: 'ladakh',
    name: 'Ladakh',
    title: 'Ladakh, with time to land.',
    stops: 'Leh & the Indus valley',
    image: '/images/destinations/hero-ladakh.jpg',
    match: 'MOUNTAIN AIR · SLOW START · FIVE DAYS',
    summary: 'A deliberately gentle first draft based around Leh, with room to acclimatise and a reminder to verify altitude, season, permits and current conditions.',
    pins: [
      { name: 'LEH', className: 'pin-a' },
      { name: 'SHEKHAR', className: 'pin-b' },
      { name: 'INDUS', className: 'pin-c' }
    ],
    days: [
      {
        dayNumber: 1,
        phase: 'ARRIVE & REST',
        title: 'A very soft first day in Leh',
        description: 'Keep plans close to your stay and allow proper time to acclimatise. Confirm health and travel guidance before choosing any activity.',
        tags: ['Arrival day', 'Rest first', 'Altitude matters'],
        extraOption: {
          heading: 'Acclimatisation rule',
          description: 'Rest completely on day one. Do not plan excursions until your body adjusts to 3,500m elevation.',
          suggestedPrompt: 'What should I know about landing in Leh?'
        }
      },
      {
        dayNumber: 2,
        phase: 'STAY CLOSE',
        title: 'A quiet day around Leh',
        description: 'Keep the outing low-effort and local. Let your energy, not a checklist, set the pace.',
        tags: ['Low effort', 'Flexible', 'Local cafés'],
        extraOption: {
          heading: 'Gentle outing',
          description: 'A stroll around the main bazaar or Shanti Stupa at a gentle walking pace.',
          suggestedPrompt: 'Suggest gentle spots around Leh for day two.'
        }
      },
      {
        dayNumber: 3,
        phase: 'FIND YOUR RHYTHM',
        title: 'One nearby place, with buffer',
        description: 'Only add an outing after checking how you feel and getting current local advice.',
        tags: ['Optional outing', 'Conditions to verify'],
        extraOption: {
          heading: 'Check weather',
          description: 'Mountain weather and pass accessibility must be verified locally on the morning of travel.',
          suggestedPrompt: 'What are safe day-three options in Ladakh?'
        }
      },
      {
        dayNumber: 4,
        phase: 'THE INDUS VALLEY',
        title: 'Choose a short scenic drive',
        description: 'Keep stops limited and the day adaptable. Check road access, permits and weather before setting off.',
        tags: ['Road day', 'Verify locally'],
        extraOption: {
          heading: 'Permit notice',
          description: 'Inner line permits and vehicle permissions are required for outlying valleys.',
          suggestedPrompt: 'Tell me about permits needed for the Indus valley.'
        }
      },
      {
        dayNumber: 5,
        phase: 'LEAVE ROOM TO RETURN',
        title: 'A gentle final day',
        description: 'Protect the transfer window and keep the rest of the day open.',
        tags: ['Transfer buffer', 'Easy finish'],
        extraOption: {
          heading: 'Airport buffer',
          description: 'Morning departures require early airport reporting due to high winds and flight schedules.',
          suggestedPrompt: 'Help me plan the Leh departure timing.'
        }
      }
    ],
    fitReasons: [
      {
        number: '01',
        title: 'Acclimatisation is prioritised',
        description: 'Rest is scheduled into days one and two before any scenic drives begin.',
        evidenceLabel: 'HEALTH & ALTITUDE SAFETY'
      },
      {
        number: '02',
        title: 'Mountain road limits respected',
        description: 'Distances in Ladakh are short in km but long in hours; buffer time is built in.',
        evidenceLabel: 'MATCHED TO: EASY PACE'
      },
      {
        number: '03',
        title: 'Low sensory overwhelm',
        description: 'Focus on vast landscapes and quiet monasteries without daily hotel shifts.',
        evidenceLabel: 'MATCHED TO: QUIET'
      }
    ],
    budget: {
      currency: 'INR',
      stayAndTaxes: '₹22k–38k',
      transfers: '₹12k–20k',
      foodAndSpends: '₹6k–10k',
      totalRange: '₹40k–68k',
      notes: 'Planning shape · High altitude permits and flights excluded. Preview mode.',
      isEstimate: true
    }
  },
  kerala: {
    id: 'kerala',
    name: 'Kerala',
    title: 'Kerala, at water level.',
    stops: 'Kochi & the backwaters',
    image: '/images/destinations/kerala.jpg',
    match: 'SLOW WATER · FOOD · FIVE DAYS',
    summary: 'A slower coastal and backwater idea with time between transfers. The precise base and boat options depend on dates and partner availability.',
    pins: [
      { name: 'KOCHI', className: 'pin-a' },
      { name: 'MARARI', className: 'pin-b' },
      { name: 'ALLEPPEY', className: 'pin-c' }
    ],
    days: [
      {
        dayNumber: 1,
        phase: 'ARRIVE & SETTLE',
        title: 'A first evening in Kochi',
        description: 'Check in, find dinner nearby and let the first evening stay easy.',
        tags: ['Arrival day', 'Food nearby'],
        extraOption: {
          heading: 'Coastal dinner',
          description: 'Try a quiet Syrian Christian or coastal meal near Fort Kochi heritage streets.',
          suggestedPrompt: 'Recommend dinner spots for our first Kochi night.'
        }
      },
      {
        dayNumber: 2,
        phase: 'OLD LANES, YOUR PACE',
        title: 'A little Fort Kochi',
        description: 'Pick one neighbourhood walk and leave an open hour for a café, gallery or rest.',
        tags: ['Easy walk', 'Local food'],
        extraOption: {
          heading: 'Art & spice history',
          description: 'Explore the spice warehouses and Jew Town at a gentle, unhurried pace.',
          suggestedPrompt: 'Give me a food-and-art walk for Fort Kochi.'
        }
      },
      {
        dayNumber: 3,
        phase: 'FOLLOW THE WATER',
        title: 'Transfer toward the backwaters',
        description: 'Choose a stay and transfer only after checking the route and live availability. Keep arrival plans light.',
        tags: ['Transfer day', 'Confirm partner details'],
        extraOption: {
          heading: 'Stay choice',
          description: 'Opt for an authentic heritage homestay along the canals rather than a large resort.',
          suggestedPrompt: 'What kind of backwater stay should I pick?'
        }
      },
      {
        dayNumber: 4,
        phase: 'A SLOW BOAT MORNING',
        title: 'Choose a water experience',
        description: 'Compare trip length, group size and operating details before you decide. The afternoon can stay yours.',
        tags: ['Optional activity', 'Slow morning'],
        extraOption: {
          heading: 'Canoe vs Houseboat',
          description: 'A morning country canoe lets you enter narrow village canals that larger boats cannot reach.',
          suggestedPrompt: 'Should we do a small canoe or a houseboat?'
        }
      },
      {
        dayNumber: 5,
        phase: 'COFFEE BEFORE YOU GO',
        title: 'Return with room to spare',
        description: 'Keep the return journey matched to your onward departure, with a sensible buffer.',
        tags: ['Transfer buffer', 'Flexible finish'],
        extraOption: {
          heading: 'Departure buffer',
          description: 'Highway road traffic toward Kochi Airport can take 2-3 hours depending on time of day.',
          suggestedPrompt: 'What buffer should I plan for Kochi airport?'
        }
      }
    ],
    fitReasons: [
      {
        number: '01',
        title: 'Water rhythm replaces vehicle time',
        description: 'Once settled near the backwaters, boat and walking transit replace road drives.',
        evidenceLabel: 'MATCHED TO: COAST & WATER'
      },
      {
        number: '02',
        title: 'Culinary depth',
        description: 'Kerala’s coastal spices, toddy shops, and homestyle cooking are central to the days.',
        evidenceLabel: 'MATCHED TO: FOOD'
      },
      {
        number: '03',
        title: 'Gentle on all generations',
        description: 'Flat terrain, shade, and boat journeys make this accessible for elders and families.',
        evidenceLabel: 'MATCHED TO: EASY MOBILITY'
      }
    ],
    budget: {
      currency: 'INR',
      stayAndTaxes: '₹20k–35k',
      transfers: '₹7k–13k',
      foodAndSpends: '₹6k–10k',
      totalRange: '₹33k–58k',
      notes: 'Planning shape · Excludes flights and peak festive surcharges. Preview mode.',
      isEstimate: true
    }
  },
  rajasthan: {
    id: 'rajasthan',
    name: 'Rajasthan',
    title: 'Rajasthan, after the rush.',
    stops: 'Jaipur & nearby',
    image: '/images/destinations/rajasthan.jpg',
    match: 'OLD STREETS · FOOD · FIVE DAYS',
    summary: 'A city-led route with early starts for outdoor visits, slower afternoons, and choices that can suit a family group.',
    pins: [
      { name: 'JAIPUR', className: 'pin-a' },
      { name: 'AMER', className: 'pin-b' },
      { name: 'NAHARGARH', className: 'pin-c' }
    ],
    days: [
      {
        dayNumber: 1,
        phase: 'ARRIVE & SETTLE',
        title: 'A calm first evening in Jaipur',
        description: 'Check in, get oriented and keep the first evening close by.',
        tags: ['Arrival day', 'Easy evening'],
        extraOption: {
          heading: 'Evening chai',
          description: 'Unwind at a quiet haveli courtyard without rushing into bazaars on arrival night.',
          suggestedPrompt: 'What should we do on our first Jaipur evening?'
        }
      },
      {
        dayNumber: 2,
        phase: 'A MORNING OUTDOORS',
        title: 'One historic site, early',
        description: 'Choose one visit before the warmer part of the day and check current opening details.',
        tags: ['Culture', 'Check opening times'],
        extraOption: {
          heading: 'Beat the crowds',
          description: 'Visit Amer or the stepwells at 8:00 AM before the heat and tour bus arrivals.',
          suggestedPrompt: 'Which fort is best to see early in the morning?'
        }
      },
      {
        dayNumber: 3,
        phase: 'LOCAL LIFE & LUNCH',
        title: 'A food-led neighbourhood day',
        description: 'Follow a local recommendation and leave time between stops.',
        tags: ['Food', 'Flexible pace'],
        extraOption: {
          heading: 'Bazaar food',
          description: 'Traditional sweets, kachoris, and block-printing artisan quarters.',
          suggestedPrompt: 'Where can we find genuine local food in Jaipur?'
        }
      },
      {
        dayNumber: 4,
        phase: 'CHOOSE YOUR DETOUR',
        title: 'A nearby place or a rest day',
        description: 'Keep this day optional. A rest or shorter outing may suit the group better.',
        tags: ['Optional outing', 'Family pace'],
        extraOption: {
          heading: 'Family pacing',
          description: 'A blue pottery workshop or puppet demonstration for children and elders.',
          suggestedPrompt: 'What is a low-stress activity in Jaipur for elders?'
        }
      },
      {
        dayNumber: 5,
        phase: 'ONE LAST CHAI',
        title: 'A flexible final morning',
        description: 'Leave a little room for one last stop, then travel with a buffer.',
        tags: ['Transfer buffer', 'Easy finish'],
        extraOption: {
          heading: 'Departure packing',
          description: 'Keep the last morning flexible for sweets and souvenirs without luggage pressure.',
          suggestedPrompt: 'Best souvenirs that support local makers?'
        }
      }
    ],
    fitReasons: [
      {
        number: '01',
        title: 'Focused on one heritage hub',
        description: 'Avoid exhausting inter-city drives across the desert by enjoying one deep base.',
        evidenceLabel: 'MATCHED TO: HERITAGE & CULTURE'
      },
      {
        number: '02',
        title: 'Heat-aware schedule',
        description: 'Visits happen early in the morning; afternoons are reserved for food and shade.',
        evidenceLabel: 'MATCHED TO: COMFORT & WEATHER'
      },
      {
        number: '03',
        title: 'Family & inter-generational fit',
        description: 'Accessible vehicles, step-free options in havelis, and rich craft stories.',
        evidenceLabel: 'MATCHED TO: FAMILY PACE'
      }
    ],
    budget: {
      currency: 'INR',
      stayAndTaxes: '₹19k–34k',
      transfers: '₹6k–12k',
      foodAndSpends: '₹5k–9k',
      totalRange: '₹30k–55k',
      notes: 'Planning shape · Monument entries and internal travel estimates. Preview mode.',
      isEstimate: true
    }
  }
};

export const partnerCategories: PartnerCategory[] = [
  {
    id: 'food',
    label: 'FOOD & NEIGHBOURHOODS',
    title: 'Follow the smell of lunch.',
    description: 'A small-group walk through the places locals return to.',
    image: '/images/categories/exp-food.jpg',
    interest: 'Food'
  },
  {
    id: 'outdoors',
    label: 'OUTDOORS & NATURE',
    title: 'Take the path that fits.',
    description: 'Choose a walk by effort, time and the day’s conditions.',
    image: '/images/categories/exp-trails.jpg',
    interest: 'Easy outdoors'
  },
  {
    id: 'culture',
    label: 'CRAFT & CULTURE',
    title: 'Meet the hands behind it.',
    description: 'Spend time with working artists, makers and cultural hosts.',
    image: '/images/categories/exp-culture.jpg',
    interest: 'Culture'
  },
  {
    id: 'family',
    label: 'FAMILY PACE',
    title: 'Plan for everyone.',
    description: 'Break up the day, keep transfers sensible, make space for rest.',
    image: '/images/categories/exp-family.jpg',
    interest: 'Family-friendly'
  }
];

export function inferRoute(prompt: string, interests: string[] = []): string {
  const text = `${prompt} ${interests.join(' ')}`.toLowerCase();
  if (/meghalaya|shillong|sohra|waterfall|rain|monsoon|root bridge|cherrapunji|khasi/.test(text)) return 'meghalaya';
  if (/rajasthan|jaipur|heritage|history|fort|palace|haveli|desert|udaipur/.test(text)) return 'rajasthan';
  if (/kerala|backwater|houseboat|canal|\bcoast\b|\bbeach\b|\bwater\b|konkan|alleppey|kochi/.test(text)) return 'kerala';
  if (/ladakh|leh|mountain|altitude|himachal|himalaya|high pass/.test(text)) return 'ladakh';
  return 'meghalaya';
}
