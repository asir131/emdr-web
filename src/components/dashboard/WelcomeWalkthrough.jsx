"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Check, X, Map, Compass, HeartPulse } from "lucide-react";
import { useStoredAuth } from "@/redux/authStorage";

const steps = [
  {
    id: 1,
    title: "Welcome to UK Inkind",
    description:
      "Your personal digital EMDR companion. We're here to guide you through your healing journey safely and at your own pace.",
    icon: <HeartPulse className="w-12 h-12 text-[#4A7C59]" />,
  },
  {
    id: 2,
    title: "Your Safe Space",
    description:
      "The dashboard is your central hub. Here you can track your progress, access resources, and view your upcoming activities.",
    icon: <Map className="w-12 h-12 text-[#4A7C59]" />,
  },
  {
    id: 3,
    title: "Easy Navigation",
    description:
      "Use the sidebar on the left to quickly jump between your Homework, EMDR Sessions, Assessments, and Progress tracking.",
    icon: <Compass className="w-12 h-12 text-[#4A7C59]" />,
  },
];

export default function WelcomeWalkthrough() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { isAuthenticated, hasHydrated } = useStoredAuth();

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      const hasSeenWalkthrough = localStorage.getItem("hasSeenWalkthrough");
      if (!hasSeenWalkthrough) {
        setIsOpen(true);
      }
    }
  }, [hasHydrated, isAuthenticated]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem("hasSeenWalkthrough", "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        >
          {/* Close Button */}
          <button
            onClick={handleComplete}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 h-1.5">
            <motion.div
              className="h-full bg-[#4A7C59]"
              initial={{ width: "0%" }}
              animate={{
                width: `${((currentStep + 1) / steps.length) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="p-8 md:p-10 flex-1 flex flex-col items-center text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  {steps[currentStep].icon}
                </div>
                <h2 className="text-2xl md:text-3xl font-serif text-gray-900 mb-4">
                  {steps[currentStep].title}
                </h2>
                <p className="text-gray-600 text-base md:text-lg leading-relaxed">
                  {steps[currentStep].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Controls */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="flex gap-2">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                    idx === currentStep ? "bg-[#4A7C59]" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
            
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#4A7C59] text-white font-medium rounded-xl hover:bg-[#3d6849] active:scale-95 transition-all"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Get Started <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
