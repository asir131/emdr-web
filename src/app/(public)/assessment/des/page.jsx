"use client";
import React, { useState } from 'react';
import { useAssessment } from '@/context/AssessmentContext';
import { useRouter } from 'next/navigation';
import { useStoredAuth } from '@/redux/authStorage';
import { motion } from 'framer-motion';
import axios from 'axios';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

const desQuestions = [
    "Some people have the experience of driving or riding in a car or bus or subway and suddenly realizing that they don't remember what has happened during all or part of the trip.",
    "Some people find that sometimes they are listening to someone talk and they suddenly realize that they did not hear part or all of what was said.",
    "Some people have the experience of finding themselves in a place and having no idea how they got there.",
    "Some people have the experience of feeling that other people, objects, and the world around them are not real.",
    "Some people have the experience of feeling that their body does not seem to belong to them.",
    "Some people sometimes find that they hear voices inside their head that tell them to do things or comment on things that they are doing.",
    "Some people have the experience of looking in a mirror and not recognizing themselves.",
    "Some people sometimes feel as if they are looking at the world through a fog so that people and objects appear far away or unclear.",
];

export default function DesPage() {
    const { phq9Answers, gad7Answers, desAnswers, setDesAnswers, setAssessmentResults } = useAssessment();
    const router = useRouter();
    const { token } = useStoredAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (index, value) => {
        setDesAnswers({ ...desAnswers, [index]: value });
    };

    const handleContinue = async () => {
        setIsSubmitting(true);
        try {
            // Map answers from objects to arrays
            const phq9Array = Array.from({ length: 9 }, (_, i) => phq9Answers[i] ?? 0);
            const gad7Array = Array.from({ length: 7 }, (_, i) => gad7Answers[i] ?? 0);
            // DES-II values are visually 0-100 but should count as 0-50 (halved) for scoring
            const desArray = Array.from({ length: 8 }, (_, i) => (desAnswers[i] ?? 0) / 2);

            const response = await axios.post(`${baseUrl}/api/assessment/submit`, {
                phq9Answers: phq9Array,
                gad7Answers: gad7Array,
                des11Answers: desArray
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setAssessmentResults(response.data.data);
            }

            router.push('/assessment/results');
        } catch (error) {
            console.error("Assessment submit error:", error);
            // Even on error, proceed to keep the flow moving as requested (no alerts)
            router.push('/assessment/results');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FCF9F4] pt-24 px-6 md:px-10">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-3xl mx-auto"
            >
                <div className="text-center mb-10">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#64748b] mb-3">INKIND EMDR</p>
                    <h2 className="text-4xl font-serif text-[#101828] mb-6">Mental Health Assessment</h2>
                    <p className='text-[#6A7282] font-semibold'>Please complete these brief questionnaires to help us understand your current mental health needs and ensure our program is the right fit for you at this time</p>
                </div>

                <div className="flex border-b border-gray-200 mb-12">
                    <div className="flex-1 text-center pb-4 text-sm font-semibold tracking-wide uppercase text-gray-300">PHQ-9</div>
                    <div className="flex-1 text-center pb-4 text-sm font-semibold tracking-wide uppercase text-gray-300">GAD-7</div>
                    <div className="flex-1 text-center pb-4 text-sm font-semibold tracking-wide uppercase text-[#1e293b] relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#1e293b]">DES-II</div>
                </div>

                <div className="flex border-l-4 border-[#7A7A7A] pl-6 py-2 mb-10 bg-gradient-to-r from-gray-50 to-transparent rounded-lg justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-serif text-[#1e293b] mb-2">Dissociative Experiences Scale (DES-II)</h3>
                        <div className="text-[#64748b] text-sm space-y-4">
                            <p className='text-[18px]'>This questionnaire consists of experiences that you may have in your daily life. We are interested in how often you have these experiences. It is important, however, that your answers show how often these experiences happen to you when you are NOT under the influence of alcohol or drugs.<br></br>  Please indicate what percentage of the time this happens to you (0% = never, 100% = always).  <br></br>    Reference: Carlson, E. B., & Putnam, F. W. (1993). An update on the Dissociative Experiences Scale. Dissociation: Progress in the Dissociative Disorders, 6(1), 16-27. </p>
                        </div>
                    </div>
                    <div className="bg-[#1e293b] text-white px-4 py-2 rounded-lg text-center min-w-[80px]">
                        <div className="text-[10px] uppercase font-bold opacity-70">Average Score</div>
                        <div className="text-2xl font-serif">
                            {desQuestions.length > 0
                                ? ((Object.values(desAnswers).reduce((acc, val) => acc + val, 0) / desQuestions.length) / 2).toFixed(1)
                                : 0}%
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {desQuestions.map((q, index) => {
                        const value = desAnswers[index] ?? 0;
                        return (
                            <div key={index} className="bg-[#FFF9F2] p-8 rounded-xl border border-[#F5EFE6]">
                                <div className="text-xs text-[#94a3b8] font-medium mb-4">Question {index + 1} of {desQuestions.length}</div>
                                <h4 className="text-xl text-[#334155] font-serif mb-10 leading-snug">{q}</h4>
                                <div className="px-2 relative">
                                    <div
                                        className="absolute -top-10 transform -translate-x-1/2 transition-all duration-75 ease-out"
                                        style={{ left: `${value}%` }}
                                    >
                                        <div className="bg-[#4A7C59] text-white text-xs font-bold px-2 py-1 rounded shadow-lg min-w-[38px] text-center mb-1">
                                            {value}%
                                        </div>
                                        <div className="w-1.5 h-1.5 bg-[#4A7C59] rotate-45 mx-auto -mt-2"></div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={value}
                                        onChange={(e) => handleChange(index, parseInt(e.target.value))}
                                        className="des-range-slider w-full h-2.5 rounded-full appearance-none cursor-pointer outline-none"
                                        style={{
                                            background: `linear-gradient(to right, #4A7C59 0%, #4A7C59 ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`
                                        }}
                                    />
                                    <div className="flex justify-between mt-3 text-[10px] uppercase font-bold text-[#94a3b8] tracking-wider">
                                        <span>0% (Never)</span>
                                        <span>50%</span>
                                        <span>100% (Always)</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-between items-center mt-12 mb-20 gap-4">
                    <button onClick={() => router.push('/assessment/gad7')} className="flex-1 bg-[#DBE5DE] text-[#334155] hover:bg-[#cfd6d3] px-6 py-3 rounded-md font-medium transition-colors">Back</button>
                    <button
                        onClick={handleContinue}
                        disabled={isSubmitting}
                        className="flex-1 bg-[#4A7C59] text-white hover:bg-[#456b4c] px-6 py-3 rounded-md font-medium transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Submitting..." : "Complete Assessment"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
