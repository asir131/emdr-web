"use client";
import React, { useState, useEffect } from 'react';
import { useAssessment } from '@/context/AssessmentContext';
import { useRouter } from 'next/navigation';
import { useStoredAuth } from "@/redux/authStorage";
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import axios from 'axios';
import toast from 'react-hot-toast';
import PaymentModal from '@/components/publicComponents/PaymentModal';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

const isFreeSelectedPlan = (plan) => {
    const name = String(plan?.name ?? "").trim().toLowerCase();
    const priceText = String(plan?.price ?? "").trim().toLowerCase();
    const hasAmount = plan?.amount !== null && plan?.amount !== undefined && plan?.amount !== "";
    const amount = Number(plan?.amount);
    const numericPrice = Number(priceText.replace(/[^0-9.-]/g, ""));
    const hasNumericPrice = /\d/.test(priceText);

    return (
        Boolean(plan?.isFree) ||
        name === "free" ||
        priceText === "free" ||
        (hasAmount && !Number.isNaN(amount) && amount === 0) ||
        (hasNumericPrice && !Number.isNaN(numericPrice) && numericPrice === 0)
    );
};

const getSubscriptionErrorMessage = (error) => {
    if (typeof error?.response?.data?.data?.message === "string") {
        return error.response.data.data.message;
    }

    if (typeof error?.response?.data?.message === "string") {
        return error.response.data.message;
    }

    if (typeof error?.response?.data?.error?.message === "string") {
        return error.response.data.error.message;
    }

    if (typeof error?.response?.data?.error === "string") {
        return error.response.data.error;
    }

    if (typeof error?.message === "string") {
        return error.message;
    }

    return "Free plan application failed. Please try again.";
};

export default function ResultsPage() {
    const { assessmentResults } = useAssessment();
    const router = useRouter();
    const { token } = useStoredAuth();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isCompletingFreePlan, setIsCompletingFreePlan] = useState(false);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState({ id: "", name: "Hero Plan", price: "120" });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // First try getting results from context
                if (assessmentResults) {
                    setResults(assessmentResults);
                } else if (token) {
                    // Fallback to fetch if context is empty (e.g., page refresh)
                    const response = await axios.get(`${baseUrl}/api/assessment/result`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (response.data.success) {
                        setResults(response.data.data);
                    }
                }

                // Get plan from localStorage
                const storedPlan = localStorage.getItem("selectedPlan");
                if (storedPlan) {
                    try {
                        setSelectedPlan(JSON.parse(storedPlan));
                    } catch (parseError) {
                        console.error("Error parsing selected plan:", parseError);
                    }
                }
            } catch (error) {
                console.error("Error fetching results:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [assessmentResults, token]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FCF9F4]">
                <Loader2 className="w-8 h-8 animate-spin text-[#4A7C59]" />
            </div>
        );
    }

    const depressionScore = results?.scores?.depression?.score || 0;
    const anxietyScore = results?.scores?.anxiety?.score || 0;
    const dissociationScore = results?.scores?.dissociation?.score || 0;
    
    const recommendation = results?.recommendation || "Evaluation complete.";
    const scores = results?.scores || {
        depression: { score: 0, outOf: 27, severity: "minimal" },
        anxiety: { score: 0, outOf: 21, severity: "minimal" },
        dissociation: { score: 0, unit: "%" }
    };

    // Rule: Either Total score (Depression + Anxiety) >= 30 OR Dissociation score >= 30 to subscribe
    const totalScore = depressionScore + anxietyScore;
    const canSubscribe = (totalScore >= 30 || dissociationScore >= 30);
    const isFreePlan = isFreeSelectedPlan(selectedPlan);

    const handleContinue = async () => {
        if (!isFreePlan) {
            setIsPaymentModalOpen(true);
            return;
        }

        if (!token) {
            router.push("/authentication/login?redirect=/assessment/results");
            return;
        }

        if (!selectedPlan.id) {
            toast.error("Free plan information is missing. Please select the plan again.");
            return;
        }

        setIsCompletingFreePlan(true);

        try {
            const response = await axios.post(
                `${baseUrl}/api/subscriptions/apply`,
                { planId: selectedPlan.id },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            const successMessage =
                response.data?.data?.message ||
                "Your application has been submitted. Access will be granted once an admin approves your request.";

            localStorage.removeItem("selectedPlan");
            toast.success(successMessage);
            router.push("/dashboard/profile");
        } catch (error) {
            console.error("Free plan application error:", error?.response?.data || error);
            toast.error(getSubscriptionErrorMessage(error));
        } finally {
            setIsCompletingFreePlan(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FCF9F4] pt-24 px-6 md:px-10 font-sans pb-20">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-3xl mx-auto"
            >
                {/* Header */}
                <div className="text-center mb-10">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#64748b] mb-3">INKIND EMDR</p>
                    <h2 className="text-4xl font-serif text-[#1e293b] mb-4">Mental Health Assessment</h2>
                    <p className="text-[#64748b] text-sm italic max-w-xl mx-auto">
                        Please complete these brief questionnaires to help us understand your current mental health needs and ensure our program is the right fit for you at this time.
                    </p>
                </div>

                {/* Status-based Box */}
                {!canSubscribe ? (
                    <div className="bg-[#FFF5F5] border-l-4 border-red-500 p-6 rounded-r-lg mb-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="text-red-500 w-6 h-6" />
                            <h3 className="text-[#1e293b] font-bold text-lg">Additional Support Recommended</h3>
                        </div>
                        <p className="text-[#475569] text-sm mb-4 leading-relaxed">
                            {recommendation || "Thank you for completing the assessment. Based on your responses, we believe you would benefit from immediate professional support before beginning a self-guided EMDR program."}
                        </p>
                        <p className="text-[#475569] text-sm leading-relaxed mt-2 italic">
                            Current Total Score: {totalScore} (Scores below 30 or requiring professional support are restricted from self-guided subscription).
                        </p>
                    </div>
                ) : (
                    <div className="bg-[#f0f9f1] border-l-4 border-[#4A7C59] p-6 rounded-r-lg mb-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <CheckCircle className="text-[#4A7C59] w-6 h-6" />
                            <h3 className="text-[#1e293b] font-bold text-lg">Assessment Complete</h3>
                        </div>
                        <p className="text-[#475569] text-sm leading-relaxed">
                            {recommendation || "Your results indicate you may benefit from our programme. You can now proceed to select your plan."}
                        </p>
                    </div>
                )}

                {/* Score Summary */}
                <div className="bg-[#FFFBF6] p-8 rounded-xl border border-[#F5EFE6] mb-8 shadow-sm">
                    <h3 className="text-2xl font-serif text-[#94a3b8] mb-6">Your Assessment Results</h3>

                    <div className="space-y-6">
                        <div className="border-b border-gray-100 pb-4">
                            <div className="flex justify-between items-baseline mb-1">
                                <h4 className="text-[#94a3b8] font-serif text-lg">Depression (PHQ-9)</h4>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-[#1e293b] font-bold capitalize">{scores.depression.severity}</span>
                                <span className="text-[#94a3b8] text-sm">(Score: {scores.depression.score}/{scores.depression.outOf})</span>
                            </div>
                        </div>

                        <div className="border-b border-gray-100 pb-4">
                            <div className="flex justify-between items-baseline mb-1">
                                <h4 className="text-[#94a3b8] font-serif text-lg">Anxiety (GAD-7)</h4>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-[#1e293b] font-bold capitalize">{scores.anxiety.severity}</span>
                                <span className="text-[#94a3b8] text-sm">(Score: {scores.anxiety.score}/{scores.anxiety.outOf})</span>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-baseline mb-1">
                                <h4 className="text-[#94a3b8] font-serif text-lg">Dissociation (DES-II)</h4>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-[#1e293b] font-bold">Score: {scores.dissociation.score}{scores.dissociation.unit}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Immediate Support Section */}
                <div className="bg-[#FFFBF6] p-8 rounded-xl border border-[#F5EFE6] mb-8 shadow-sm">
                    <h3 className="text-2xl font-serif text-[#94a3b8] mb-6">Immediate Support Available</h3>

                    <div className="space-y-6">
                        <div>
                            <h4 className="text-[#1e293b] font-semibold text-lg mb-1">Samaritans (24/7)</h4>
                            <p className="text-[#64748b] text-sm mb-1">Free emotional support for anyone in distress</p>
                            <p className="text-sm font-medium text-[#1e293b]">Call: 116 123 <span className="text-[#94a3b8] font-normal">(Free from any phone)</span></p>
                        </div>

                        <div>
                            <h4 className="text-[#1e293b] font-semibold text-lg mb-1">NHS Crisis Line</h4>
                            <p className="text-[#64748b] text-sm mb-1">Urgent mental health support</p>
                            <p className="text-sm font-medium text-[#1e293b]">Call: 111 <span className="text-[#94a3b8] font-normal">and select mental health option</span></p>
                        </div>

                        <div>
                            <h4 className="text-[#1e293b] font-semibold text-lg mb-1">SHOUT Crisis Text Line</h4>
                            <p className="text-[#64748b] text-sm mb-1">24/7 text support for anyone in crisis</p>
                            <p className="text-sm font-medium text-[#1e293b]">Text &quot;SHOUT&quot; to 85258</p>
                        </div>

                        <div>
                            <h4 className="text-[#1e293b] font-semibold text-lg mb-1">Your GP Surgery</h4>
                            <p className="text-[#64748b] text-sm mb-1">Contact your GP for an urgent appointment</p>
                            <p className="text-[#64748b] text-sm">They can provide immediate support and referrals</p>
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-between items-center gap-4">
                    <button
                        onClick={() => router.push('/assessment/des')}
                        className="flex-1 bg-[#DBE5DE] text-[#334155] hover:bg-[#cfd6d3] px-6 py-4 rounded-md font-serif text-lg transition-colors shadow-sm"
                    >
                        Back
                    </button>

                    {canSubscribe ? (
                        <button
                            onClick={handleContinue}
                            disabled={isCompletingFreePlan}
                            className="flex-1 bg-[#4A7C59] text-white hover:bg-[#456b4c] px-6 py-4 rounded-md font-serif text-lg transition-all shadow-md active:scale-95 text-center disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isCompletingFreePlan
                                ? "Submitting..."
                                : isFreePlan
                                    ? "Complete"
                                    : "Continue"}
                        </button>
                    ) : (
                        <div className="flex-1 bg-gray-100 text-gray-400 px-6 py-4 rounded-md font-serif text-lg text-center cursor-not-allowed">
                            Subscription Restricted
                        </div>
                    )}
                </div>

            </motion.div>

            {/* Payment Modal Integration */}
            {!isFreePlan && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    planName={selectedPlan.name}
                    price={selectedPlan.price}
                    planId={selectedPlan.id}
                />
            )}
        </div>
    );
}
