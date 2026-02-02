import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@/lib/db/supabaseAdmin';
import { getServerSupabase } from '@/lib/db/supabaseServer';
import { getOrCreateOrgId } from '@/lib/org';
import { getStripe } from '@/lib/stripe';

const TRIAL_DAYS = Number(process.env.STRIPE_TRIAL_DAYS || 14);

export async function POST(req: Request) {
  const stripePriceId = process.env.STRIPE_PRICE_ID || '';
  if (!stripePriceId) {
    return NextResponse.json(
      { error: 'Missing STRIPE_PRICE_ID.' },
      { status: 500 }
    );
  }

  const supabase = await getServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const orgId = await getOrCreateOrgId(supabase, user);
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('stripe_customer_id, billing_email')
    .eq('id', orgId)
    .maybeSingle();

  if (orgError) {
    return NextResponse.json(
      { error: `Org lookup failed: ${orgError.message}` },
      { status: 500 }
    );
  }

  const origin = req.headers.get('origin') || process.env.STRIPE_SUCCESS_URL || '';
  const successUrl = process.env.STRIPE_SUCCESS_URL || `${origin}/estimate?billing=success`;
  const cancelUrl = process.env.STRIPE_CANCEL_URL || `${origin}/estimate?billing=cancel`;

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: stripePriceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer: org?.stripe_customer_id || undefined,
    customer_email: org?.stripe_customer_id ? undefined : user.email || undefined,
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: {
        org_id: orgId,
        user_id: user.id
      }
    },
    metadata: {
      org_id: orgId,
      user_id: user.id
    }
  });

  if (!session.url) {
    return NextResponse.json(
      { error: 'Stripe session missing url.' },
      { status: 500 }
    );
  }

  if (user.email && orgId && !org?.billing_email) {
    try {
      const admin = getSupabaseAdmin();
      await admin
        .from('organizations')
        .update({ billing_email: user.email })
        .eq('id', orgId);
    } catch {
      // Non-blocking.
    }
  }

  return NextResponse.json({ url: session.url });
}
