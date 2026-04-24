"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { X, Loader2, ShieldCheck, CreditCard } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";
import { AppConstants } from "@/utils/app_constant";
import { createPaymentIntent, confirmPayment } from "@/services/stripeService";
import { useStoredAuth } from "@/redux/authStorage";
import { useSubscribeMutation } from "@/redux/api/subscriptionApi";

// Initialize Stripe
const stripePromise = loadStripe(AppConstants.Publishable_key);

const ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "#1a1a1a",
      fontFamily: "inherit",
      "::placeholder": {
        color: "#9ca3af",
      },
    },
    invalid: {
      color: "#ef4444",
    },
  },
};

const CheckoutForm = ({ onClose, planName, price, planId, clientSecret, token }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [subscribe] = useSubscribeMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardNumberElement),
        },
      });

      if (result.error) {
        setError(result.error.message);
      } else if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
        console.log("✅ Payment successful!");
        try {
          await confirmPayment(result.paymentIntent.id, token);
          toast.success("Payment Successful!");
          onClose();
        } catch (backendError) {
          console.error("Backend Error:", backendError);
          setError(backendError?.response?.data?.message || backendError?.message || "Payment confirmation failed on server.");
          return;
        }
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-7">
      <div className="bg-[#fcfdfd] rounded-[20px] p-6 flex justify-between items-center border border-gray-100 shadow-sm">
        <div>
          <h3 className="text-[22px] font-serif text-[#1C2C2E] mb-1">{planName}</h3>
          <p className="text-[13px] text-gray-400 font-normal italic">Secure Checkout</p>
        </div>
        <div className="text-right">
          <span className="text-[24px] font-bold text-[#4A7C59]">{price}</span>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-2 text-[#4A7C59] mb-1">
          <ShieldCheck size={18} />
          <span className="text-sm font-semibold uppercase tracking-wider">Secure Payment</span>
        </div>

        {/* Only Individual Fields - No logo/branding will appear here */}
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 z-10">
              <CreditCard size={20} />
            </div>
            <div className="w-full pl-12 pr-4 py-4 rounded-[16px] border border-gray-200 focus-within:ring-2 focus-within:ring-[#4A7C59]/10 focus-within:border-[#4A7C59] transition-all bg-white">
              <CardNumberElement options={ELEMENT_OPTIONS} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="px-5 py-4 rounded-[16px] border border-gray-200 focus-within:ring-2 focus-within:ring-[#4A7C59]/10 focus-within:border-[#4A7C59] transition-all bg-white">
              <CardExpiryElement options={ELEMENT_OPTIONS} />
            </div>
            <div className="px-5 py-4 rounded-[16px] border border-gray-200 focus-within:ring-2 focus-within:ring-[#4A7C59]/10 focus-within:border-[#4A7C59] transition-all bg-white">
              <CardCvcElement options={ELEMENT_OPTIONS} />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-600 text-[13px] font-medium border border-red-100">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-4 rounded-[16px] border border-gray-200 font-bold text-[16px] text-gray-400 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full py-4 rounded-[16px] bg-[#4A7C59] text-white font-bold text-[16px] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#4A7C59]/30"
        >
          {isProcessing ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            `Pay Now`
          )}
        </button>
      </div>
    </form>
  );
};

const PaymentModal = ({ isOpen, onClose, planName = "Hero Plan", price = "120", planId = "hero-plan" }) => {
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);

  const { token } = useStoredAuth();

  useEffect(() => {
    if (isOpen && planId) {
      const fetchSecret = async () => {
        setLoading(true);
        try {
          const res = await createPaymentIntent(planId, token);
          if (res?.clientSecret) {
            setClientSecret(res.clientSecret);
          }
        } catch (err) {
          console.error("Failed to initialize payment:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchSecret();
    } else {
      setClientSecret("");
    }
  }, [isOpen, planId, token]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[6px]" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-[32px] w-full max-w-[500px] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.3)] border border-gray-100"
        >
          <div className="flex items-center justify-between px-8 py-7 border-b border-gray-50">
            <div>
              <h2 className="text-[26px] font-bold text-[#1a1a1a] font-serif">Payment Checkout</h2>
              <div className="flex items-center gap-1.5 opacity-40">
                <ShieldCheck size={14} />
                <span className="text-[11px] font-bold uppercase tracking-widest">Fully Secure</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-300">
              <X size={26} />
            </button>
          </div>

          <div className="overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 size={45} className="animate-spin text-[#4A7C59] opacity-20" />
              </div>
            ) : clientSecret ? (
              <Elements stripe={stripePromise}>
                <CheckoutForm
                  onClose={onClose}
                  planName={planName}
                  price={price}
                  planId={planId}
                  clientSecret={clientSecret}
                  token={token}
                />
              </Elements>
            ) : (
              <div className="p-12 text-center text-red-500">Initialization failed.</div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentModal;






