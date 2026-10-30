import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { botskillClient } from '@/lib/adapters/botskill-client';

export async function GET(req: NextRequest) {
  try {
    const rules = await botskillClient.listPolicyRules();
    return apiSuccess({ rules, count: rules.length });
  } catch (err) {
    return apiError('Failed to fetch BOTSKILL policy rules', 'RULES_FETCH_FAILED', 500, String(err));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, condition, required_action, prohibited_actions, severity, rule_type } = body;

    if (!title || !condition || !required_action) {
      return apiError('Title, condition, and required_action are required', 'INVALID_RULE_DATA', 400);
    }

    const result = await botskillClient.createPolicyRule({
      title,
      condition,
      required_action,
      prohibited_actions: Array.isArray(prohibited_actions) ? prohibited_actions : [],
      severity: severity || 'HIGH',
      rule_type: rule_type || 'MANDATORY_POLICY'
    });

    return apiSuccess(result);
  } catch (err) {
    return apiError('Failed to create company policy rule', 'RULE_CREATE_FAILED', 500, String(err));
  }
}
