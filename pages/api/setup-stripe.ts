// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

// import stripe
import stripe from "stripe";

// set up your stripe instance
const stripeInstance = new stripe(`${process.env.STRIPE_SECRET_KEY}`, {
  apiVersion: "2022-11-15",
});

// Parameters to pass to this endpoint
export interface SetupStripeParameters {
  amount: number;
}

// Return type
export interface SetupStripeResponseData {
  paymentIntents: stripe.Response<stripe.PaymentIntent>;
}


// Handler runs when the endpoint is called
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SetupStripeResponseData>
) {
  // get the amount we passed to the parameters
  const { amount } = JSON.parse(req.body) as SetupStripeParameters;

  // create a payment intent, this returns the client_secret we need
  const paymentIntents = await stripeInstance.paymentIntents.create({
    amount: amount,
    currency: "eur",
    automatic_payment_methods: {
      enabled: true,
    },
  });

  // Return the client_secret and the rest of the payment intent
  res.json({ paymentIntents });
}
