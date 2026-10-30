import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-response';
import {
  getNextStepForTraveler,
  getConversations,
  getPartnerInquiries,
  getAdminPartners
} from '@/lib/portal/portal-service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = (searchParams.get('role') || 'traveler') as 'traveler' | 'partner' | 'admin';
  const routeKey = searchParams.get('routeKey') || 'meghalaya';

  if (role === 'partner') {
    const inquiries = getPartnerInquiries();
    const conversations = getConversations();
    return apiSuccess({
      role: 'partner',
      partnerProfile: {
        id: 'partner-sohra',
        name: 'Sohra Indigenous Stays Collective',
        category: 'Homestay & Eco-Host',
        isVerified: true,
        region: 'Meghalaya'
      },
      stats: {
        newInquiries: inquiries.filter((i) => i.status === 'new').length,
        pendingQuotes: inquiries.filter((i) => i.status === 'quoted').length,
        activeThreads: conversations.length
      },
      recentInquiries: inquiries.slice(0, 5)
    });
  }

  if (role === 'admin') {
    const partners = getAdminPartners();
    const inquiries = getPartnerInquiries();
    return apiSuccess({
      role: 'admin',
      stats: {
        totalPartners: partners.length,
        pendingVerification: partners.filter((p) => p.verificationStatus === 'pending').length,
        verifiedPartners: partners.filter((p) => p.verificationStatus === 'verified').length,
        totalTravelerBriefs: inquiries.length
      },
      pendingReviews: partners.filter((p) => p.verificationStatus === 'pending')
    });
  }

  // Traveler default
  const nextStep = getNextStepForTraveler(routeKey);
  const conversations = getConversations();
  const unreadCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return apiSuccess({
    role: 'traveler',
    activeDestination: routeKey,
    nextStep,
    unreadMessages: unreadCount,
    activeItineraryCountdown: {
      destination: routeKey === 'meghalaya' ? 'Meghalaya (Shillong & Sohra)' : routeKey.toUpperCase(),
      status: 'In Planning Stage',
      daysUntilTrip: 24,
      pacingTag: '5 Days · Easy Pace'
    }
  });
}
