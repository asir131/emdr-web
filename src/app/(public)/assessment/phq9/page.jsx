"use client";
import React from 'react';
import { useAssessment } from '@/context/AssessmentContext'; // Correct path to context
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const phq9Questions = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
    "Trouble concentrating on things, such as reading the newspaper or watching television",
    "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
    "Thoughts that you would be better off dead or of hurting yourself in some way",
];

const options = [
    { label: "Not at all", value: 0 },
    { label: "Several days", value: 1 },
    { label: "More than half the days", value: 2 },
    { label: "Nearly every day", value: 3 },
];

export default function Phq9Page() {
    const { phq9Answers, setPhq9Answers } = useAssessment();
    const router = useRouter();

    const handleChange = (index, value) => {
        setPhq9Answers({ ...phq9Answers, [index]: value });
    };

    return (
        <div className="min-h-screen bg-[#FCF9F4] pt-10 px-6 md:px-10">
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
                    <div className="flex-1 text-center pb-4 text-sm font-semibold tracking-wide uppercase text-[#1e293b] relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#1e293b]">PHQ-9</div>
                    <div className="flex-1 text-center pb-4 text-sm font-semibold tracking-wide uppercase text-gray-300">GAD-7</div>
                    <div className="flex-1 text-center pb-4 text-sm font-semibold tracking-wide uppercase text-gray-300">DES-II</div>
                </div>

                <div className="flex border-l-4 border-[#7A7A7A] pl-6 py-2 mb-10 bg-gradient-to-r from-gray-50 to-transparent rounded-lg justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-serif text-[#1e293b] mb-2">Patient Health Questionnaire (PHQ-9)</h3>
                        <p className="text-[#64748b]">Over the last 2 weeks, how often have you been bothered by any of the following problems?</p>
                    </div>
                    {/* <div className="bg-[#1e293b] text-white px-4 py-2 rounded-lg text-center min-w-[80px]">
                        <div className="text-[10px] uppercase font-bold opacity-70">Current Score</div>
                        <div className="text-2xl font-serif">
                            {Object.values(phq9Answers).reduce((acc, val) => acc + val, 0)}
                        </div>
                    </div> */}
                </div>

                <div className="space-y-6">
                    {phq9Questions.map((q, index) => (
                        <div key={index} className="bg-[#FFF9F2] p-8 rounded-xl border border-[#F5EFE6]">
                            <div className="text-xs text-[#94a3b8] font-medium mb-4">Question {index + 1} of {phq9Questions.length}</div>
                            <h4 className="text-xl text-[#334155] font-serif mb-8 leading-snug">{q}</h4>
                            <div className="space-y-2">
                                {options.map((opt) => {
                                    const isSelected = phq9Answers[index] === opt.value;
                                    return (
                                        <label
                                            key={opt.value}
                                            onClick={() => handleChange(index, opt.value)}
                                            className="flex items-center justify-between py-3 px-2 cursor-pointer hover:bg-[#FDF6ED] rounded-lg transition-colors group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? "border-[#94a3b8]" : "border-[#D1D5DB] group-hover:border-[#94a3b8]"}`}>
                                                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" />}
                                                </div>
                                                <span className={`text-[15px] ${isSelected ? "text-[#1e293b] font-medium" : "text-[#475569]"}`}>{opt.label}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-[#94a3b8]">{opt.value}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between items-center mt-12 mb-20 gap-4">
                    <button onClick={() => router.back()} className="flex-1 bg-[#DBE5DE] text-[#334155] hover:bg-[#DBE5DE] px-6 py-3 rounded-md font-medium transition-colors">Back</button>
                    <button
                        onClick={() => router.push('/assessment/gad7')}
                        disabled={Object.keys(phq9Answers).length < phq9Questions.length}
                        className="flex-1 bg-[#4A7C59] text-white hover:bg-[#456b4c] px-6 py-3 rounded-md font-medium transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Continue
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
