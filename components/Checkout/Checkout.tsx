import React, { FC, SyntheticEvent, useCallback, useEffect, useRef, useState, } from "react";
import { Appearance, loadStripe, Stripe, StripeElements, StripeError, StripePaymentElementOptions, } from "@stripe/stripe-js";
import { SetupStripeResponseData } from "../../pages/api/setup-stripe";

// get the env vars
const publishableKey = `${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`;

// Configure the appearance of the Stripe payment element
const appearance: Appearance = {
  theme: "night",
};

// Configure the Stripe payment element options
const paymentElementOptions: StripePaymentElementOptions = {
  business: { name: "" },
  fields: {
    billingDetails: "auto",
  },
};

const Checkout: FC = () => {
  const [error, setError] = useState<
    StripeError | { message: string } | null
  >();
  const [status, setStatus] = useState<
    "succeeded" | "waiting_for_user" | null
  >();
  const [loading, setLoading] = useState<boolean>(false);
  const checkoutTargetRef = useRef<HTMLDivElement>(null);
  const stripeInstance = useRef<{ data: Stripe | null }>({ data: null });
  const stripeElement = useRef<{ data: StripeElements | undefined }>({
    data: undefined,
  });

  const setupStripe = useCallback(async () => {
    // Load the resources for stripe
    stripeInstance.current.data = await loadStripe(publishableKey);
    // show the form
    setStatus("waiting_for_user");
  }, [stripeInstance]);

  const prepareCheckout = useCallback(async () => {
    try {
      // call our api to create a new session for the payment intent
      const response = await fetch("/api/setup-stripe", {
        method: "POST",
        body: JSON.stringify({
          // for now we are just going to hard code the amount
          amount: 999,
        }),
      });
      const session = (await response.json()) as SetupStripeResponseData;

      // check if everything was setup correctly
      if (
        session.paymentIntents.client_secret &&
        stripeInstance.current.data &&
        checkoutTargetRef.current
      ) {
        // create the payment elements instance, with the appearance settings and the client secret
        const elements = stripeInstance.current.data?.elements({
          appearance,
          clientSecret: session.paymentIntents.client_secret,
        });
        stripeElement.current.data = elements;

        // create the payment element
        const paymentElement = elements?.create(
          "payment",
          paymentElementOptions
        );

        // mount the payment element to the checkoutTargetRef
        paymentElement?.mount(checkoutTargetRef.current);
      } else {
        throw new Error("Element Setup failed");
      }
    } catch (error) {
      console.error(error);
      setError({ message: (error as Error).message ?? "Something went wrong" });
    }
  }, [checkoutTargetRef, stripeElement, stripeInstance]);

  const handleSubmit = useCallback(
    async (event: SyntheticEvent) => {
      event.preventDefault();

      // show a loading indicator, this might take a few seconds
      setLoading(true);

      // check if the stripe instance and element has been set up
      if (stripeInstance.current.data && stripeElement.current.data) {
        // confirm the payment
        const response = await stripeInstance.current.data.confirmPayment({
          elements: stripeElement.current.data,
          redirect: "if_required",
        });
        // check if the payment was successful
        const status = response.paymentIntent?.status;
        // get the error in the response, this also includes missing fields etc.
        const error = response.error;

        // set the error
        if (error) { setError(error); }

        // if this succeeds, the payment was successful
        if (status === "succeeded") {
          setError(null);
          setStatus(status);
        }
        setLoading(false);
      } else {
        setError({ message: "Instance or Element not ready" });
      }
    },
    [stripeElement, stripeInstance]
  );

  useEffect(() => {
    // initiate the stripe instance and mount the payment element
    setupStripe().then(prepareCheckout);
  }, [setupStripe, prepareCheckout]);

  return (
    <div>
      {loading && <h3>PROCESSING PAYMENT...</h3>}

      {status === "succeeded" && <h1>Payment succeeded!</h1>}

      {status === "waiting_for_user" && (
        <>
          <div ref={checkoutTargetRef}></div>
          {error && <div className="error">{error.message}</div>}
          <button onClick={handleSubmit}>Submit</button>
        </>
      )}
    </div>
  );
};

export default Checkout;
