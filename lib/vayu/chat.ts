export interface ChatAdjustmentResponse {
  answer: string;
  suggestedAction?: 'adjust_pacing' | 'add_food_day' | 'verify_transfers' | 'altitude_rest';
  disclaimer: string;
}

export function handleVayuChat(query: string, currentRouteKey: string): ChatAdjustmentResponse {
  const lower = query.toLowerCase();

  if (lower.includes('drive') || lower.includes('road') || lower.includes('transfer')) {
    return {
      answer:
        'For a gentler version, keep one base change and treat scenic stops as optional. In a live plan, I check road conditions and verified mountain transfer times before fixing dates.',
      suggestedAction: 'verify_transfers',
      disclaimer: 'Planning suggestion · Live road conditions must be verified before travel'
    };
  }

  if (lower.includes('food') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('café')) {
    return {
      answer:
        `We can reshape day two or three to highlight regional food. For ${currentRouteKey === 'kerala' ? 'Kerala' : 'this route'}, that means local morning markets and unhurried courtyard dining rather than hurried viewpoint stops.`,
      suggestedAction: 'add_food_day',
      disclaimer: 'Planning suggestion · Independent partner hosts will be cited with verified details'
    };
  }

  if (lower.includes('easy') || lower.includes('walk') || lower.includes('active') || lower.includes('gentle')) {
    return {
      answer:
        'We can switch the itinerary days to low-effort alternatives. Valley walks with steps can be replaced with direct vehicular viewpoints so everyone travels comfortably.',
      suggestedAction: 'adjust_pacing',
      disclaimer: 'Planning suggestion · Step-free and mobility notes must be verified per location'
    };
  }

  if (lower.includes('leh') || lower.includes('altitude') || lower.includes('acclimatise')) {
    return {
      answer:
        'For Ladakh trips, non-negotiable medical advice is to spend the first 36-48 hours resting in Leh. We keep local excursions strictly within 15 minutes of your base.',
      suggestedAction: 'altitude_rest',
      disclaimer: 'Health safety note · Consult medical guidance before high-altitude travel'
    };
  }

  return {
    answer:
      'I can adjust the pace, interests, or transfer effort for this route. In the live release, every change will cite its verified source and partner terms.',
    disclaimer: 'Preview response · AI assisted, human decided'
  };
}
