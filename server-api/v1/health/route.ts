import { apiSuccess } from '@/lib/api-response';
import { botskillClient } from '@/lib/adapters/botskill-client';

export async function GET() {
  const botskillStatus = await botskillClient.getEngineStatus();

  return apiSuccess({
    status: 'healthy',
    version: '1.0.0',
    service: 'Vayanai Travel Companion API',
    offlineMode: true,
    supportedRoutes: ['meghalaya', 'ladakh', 'kerala', 'rajasthan'],
    botskillEngine: botskillStatus || {
      status: 'offline_fallback_active',
      slmRuntime: { status: 'READY_ON_STARTUP', provider: 'llama_cpp' },
      draftOnlyEnforced: true
    },
    serverTime: new Date().toISOString()
  });
}
