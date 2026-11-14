/**
 * Capabilities detector
 * Evaluates configured services without throwing or breaking imports when env keys are absent.
 */

export interface Capabilities {
  database: boolean;
  auth: boolean;
  ai: boolean;
  codeExecution: boolean;
  payments: boolean;
}

export function getCapabilities(): Capabilities {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const hasValidSupabase =
    Boolean(supabaseUrl && supabaseAnon) &&
    !supabaseUrl.includes('your-project') &&
    supabaseUrl.startsWith('http');

  const groqKey = process.env.GROQ_API_KEY || '';
  const openRouterKey = process.env.OPENROUTER_API_KEY || '';
  const hasAi = Boolean(
    (groqKey && !groqKey.includes('your_')) ||
    (openRouterKey && !openRouterKey.includes('your_'))
  );

  const judge0Url = process.env.JUDGE0_URL || '';
  const hasJudge0 = Boolean(judge0Url && !judge0Url.includes('your_') && judge0Url.startsWith('http'));

  const razorpayKey = process.env.RAZORPAY_KEY_ID || '';
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  const hasPayments = Boolean(
    (razorpayKey && !razorpayKey.includes('your_')) ||
    (stripeKey && !stripeKey.includes('your_'))
  );

  return {
    database: hasValidSupabase,
    auth: hasValidSupabase,
    ai: hasAi,
    codeExecution: hasJudge0,
    payments: hasPayments,
  };
}
