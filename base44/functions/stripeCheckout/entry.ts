import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { mode, price, title, reportId, analystName, boostPlanId } = await req.json();

    const appUrl = req.headers.get('origin') || 'https://app.base44.com';
    const successUrl = `${appUrl}/pay?success=true`;
    const cancelUrl = `${appUrl}/pay?cancelled=true`;

    let sessionParams = {};

    if (mode === 'subscription') {
      const priceId = Deno.env.get("STRIPE_SUBSCRIPTION_PRICE_ID");
      sessionParams = {
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: user.email,
        metadata: { userId: user.id, mode: 'subscription' },
        success_url: `${appUrl}/?subscription=success`,
        cancel_url: cancelUrl,
      };
    } else if (mode === 'report') {
      const amountCents = Math.round((parseFloat(price) || 4.99) * 100);
      sessionParams = {
        mode: 'payment',
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: title || 'Premium Report',
              description: `By ${analystName || 'Analyst'} — one-time access`,
            },
          },
        }],
        customer_email: user.email,
        metadata: { userId: user.id, mode: 'report', reportId: reportId || '' },
        success_url: `${appUrl}/report?id=${reportId}&paid=true`,
        cancel_url: cancelUrl,
      };
    } else if (mode === 'boost') {
      const amountCents = Math.round((parseFloat(price) || 4.99) * 100);
      sessionParams = {
        mode: 'payment',
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: title || 'Report Boost',
              description: 'Boost your report visibility on the feed',
            },
          },
        }],
        customer_email: user.email,
        metadata: { userId: user.id, mode: 'boost', boostPlanId: boostPlanId || '' },
        success_url: `${appUrl}/editor?boost=success`,
        cancel_url: cancelUrl,
      };
    } else if (mode === 'analyst') {
      const planPrice = parseFloat(price) || 9;
      const amountCents = Math.round(planPrice * 100);
      sessionParams = {
        mode: 'subscription',
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            recurring: { interval: 'month' },
            product_data: {
              name: `${analystName || 'Analyst'} Subscription`,
              description: 'Monthly access to premium reports and predictions',
            },
          },
        }],
        customer_email: user.email,
        metadata: { userId: user.id, mode: 'analyst', analystName: analystName || '' },
        success_url: `${appUrl}/?analyst_sub=success`,
        cancel_url: cancelUrl,
      };
    } else {
      return Response.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});