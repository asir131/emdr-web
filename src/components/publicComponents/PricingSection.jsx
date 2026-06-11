"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { useStoredAuth } from "@/redux/authStorage";
import { getApiHeaders } from "@/utils/apiHeaders";

const PricingSection = ({ compact = false, activePlanName }) => {
  const router = useRouter();
  const { isAuthenticated } = useStoredAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/subscriptions/plans`,
          { headers: getApiHeaders() },
        );
        const result = await response.json();
        if (result.success) {
          // Map API data to component structure
          const mappedPlans = result.data.map((plan) => {
            const normalizedActive = activePlanName?.trim()?.toLowerCase();
            const normalizedPlan = plan.name?.trim()?.toLowerCase();
            const isActive = normalizedActive && normalizedPlan && normalizedActive === normalizedPlan;
            const hasPrice = plan.price !== null && plan.price !== undefined && plan.price !== "";
            const isFree = (hasPrice && Number(plan.price) === 0) || normalizedPlan === "free";
            return {
              id: plan._id,
              name: isFree ? "Community Access" : plan.name,
              price: isFree ? "Free" : `${plan.currency}${plan.price}`,
              amount: plan.price,
              currency: plan.currency,
              duration:
                plan.interval === "monthly" ? "/month" : `/${plan.interval}`,
              subText: plan.tagline,
              features: plan.features,
              buttonText: isActive
                ? "Active Plan"
                : isFree
                  ? "Apply for Access"
                  : "Get Started",
              hasSpots: plan.isCommunityAccess,
              spots: 12, // Hardcoded as in original, could be from API if available
              isFree,
              isActive: isActive,
              recommended: plan.name === "Prime Plan", // Keep original recommendation logic
            };
          });
          setPlans(mappedPlans);
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [activePlanName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A7C59]" />
      </div>
    );
  }

  const handlePlanSelect = (plan) => {
    localStorage.setItem(
      "selectedPlan",
      JSON.stringify({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        amount: plan.amount,
        currency: plan.currency,
        isFree: plan.isFree,
      }),
    );

    router.push(
      isAuthenticated
        ? "/consent"
        : "/authentication/login?redirect=/consent",
    );
  };

  const CardsGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 items-stretch ">
      {plans.map((plan, index) => (
        <motion.div
          key={plan.id || index}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className={`relative bg-white rounded-[20px] p-6 flex flex-col transition-all duration-300 w-full ${plan.isActive || (!activePlanName && plan.recommended)
            ? "border-[2.5px] border-[#4A7C59] scale-105 z-10 shadow-xl"
            : "border border-gray-200 shadow-sm"
            }`}
        >
          {plan.isActive ? (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#4A7C59] rounded-2xl px-4 py-0.5 z-20">
              <span className="text-[14px] text-white font-semibold tracking-widest">
                Current Plan
              </span>
            </div>
          ) : plan.recommended && !activePlanName && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FDC700] rounded-2xl px-4 py-0.5 z-20">
              <span className="text-[14px] text-[#101828] font-semibold tracking-widest">
                Recommended
              </span>
            </div>
          )}

          {/* Top Info */}
          <div className="text-left mb-6">
            <h3 className="text-2xl font-semibold text-[#101828] mb-1">
              {plan.name}
            </h3>
            {!plan.isFree && (
              <div className="flex items-baseline gap-0.5">
                <span className="text-3xl font-serif text-[#101828]">
                  {plan.price}
                </span>
                <span className="text-[#101828] text-[12px] font-medium">
                  {plan.duration}
                </span>
              </div>
            )}
            <p className="text-[#4A7C59] text-[14px] mt-2 leading-snug min-h-[32px]">
              {plan.subText}
            </p>
          </div>

          {plan.hasSpots && (
            <div className="border border-[#DBE5DE] bg-[#FFF8F0] rounded-lg p-3 mb-6 text-center">
              <div className="text-xl font-bold text-[#1C2C2E]">
                {plan.spots}
              </div>
              <div className="text-[9px] text-gray-500 uppercase font-black tracking-tighter">
                Spots Available
              </div>
            </div>
          )}

          <div className="flex-grow mb-8 space-y-3">
            {plan.features.map((feature, fIndex) => (
              <div
                key={fIndex}
                className="flex items-start gap-2 text-[#4A7C59]"
              >
                <Check className="w-3.5 h-3.5 text-[#364153] mt-0.5 shrink-0" />
                <span className="text-[14px] text-[#364153] leading-tight">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-auto">
            <button
              disabled={plan.isActive}
              onClick={() => handlePlanSelect(plan)}
              className={`w-full py-2.5 rounded-lg text-[16px] font-medium border-[1.5px] transition-all ${plan.isActive
                ? "bg-[#4A7C59] border-[#4A7C59] text-white opacity-80 cursor-not-allowed"
                : plan.recommended && !activePlanName
                  ? "bg-white border-[#4A7C59] text-[#4A7C59] hover:bg-[#456b4c] hover:text-white"
                  : "bg-white border-gray-300 text-gray-700 hover:border-[#4A7C59] hover:text-[#4A7C59]"
                }`}
            >
              {plan.buttonText}
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );

  if (compact) {
    return (
      <div className="mt-16 w-full">
        <CardsGrid />
      </div>
    );
  }

  return (
    <section className="bg-[#FCF9F4] py-24 px-6 md:px-10">
      <div className="max-w-[90%] mx-auto">
        {/* Header Content */}
        <div className="text-center mb-20">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-serif text-[#1C2C2E] mb-6"
          >
            Choose the Plan That’s Right for You
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-[#6E8B7A] text-xl font-medium"
          >
            Flexible pricing options to support your healing journey – cancel
            anytime.
          </motion.p>
        </div>

        <CardsGrid />
      </div>
    </section>
  );
};

export default PricingSection;
