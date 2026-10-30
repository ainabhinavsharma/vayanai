import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { botskillClient } from '@/lib/adapters/botskill-client';

export async function GET(req: NextRequest) {
  try {
    const status = await botskillClient.getEngineStatus();
    return apiSuccess(
      status || {
        service: 'BOTSKILL Vayanai Intelligence Engine',
        version: '3.0.0',
        slmRuntime: { status: 'NOT_INSTALLED', provider: 'llama_cpp' },
        activeRoutes: ['meghalaya', 'ladakh', 'kerala', 'rajasthan'],
        activePolicyRulesCount: 0,
        isHalted: false,
        draftOnlyEnforced: true,
        isFallback: true
      }
    );
  } catch (err) {
    return apiError('Failed to probe BOTSKILL engine status', 'STATUS_PROBE_FAILED', 500, String(err));
  }
}
