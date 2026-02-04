import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { getSupabaseAdmin } from '@/lib/db/supabaseAdmin';
import { getStripe } from '@/lib/stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

const updateOrgFromSubscription = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  subscription: Stripe.Subscription & { current_period_end?: number | null }
) => {
  const orgId = subscription.metadata?.org_id;
  const stripeCustomerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

  const priceId = subscription.items.data[0]?.price?.id || null;
  const payload = {
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    price_id: priceId,
    current_period_end:
      typeof subscription.current_period_end === 'number'
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null
  };

  if (orgId) {
    await supabase.from('organizations').update(payload).eq('id', orgId);
    return;
  }

  if (stripeCustomerId) {
    await supabase
      .from('organizations')
      .update(payload)
      .eq('stripe_customer_id', stripeCustomerId);
  }
};

export async function POST(req: Request) {
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Missing STRIPE_WEBHOOK_SECRET.' },
      { status: 500 }
    );
  }

  const signature = req.headers.get('stripe-signature') || '';
  const body = await req.text();

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid signature.' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.org_id;
      const stripeCustomerId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;
      const stripeSubscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

      if (orgId) {
        await supabase
          .from('organizations')
          .update({
            stripe_customer_id: stripeCustomerId || null,
            stripe_subscription_id: stripeSubscriptionId || null
          })
          .eq('id', orgId);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await updateOrgFromSubscription(supabase, subscription);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
