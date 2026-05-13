"use client";
import React from 'react';
import { motion } from 'framer-motion';

// Dynamic Data Array
const resultsData = [
  { id: 1, title: "PTSD & Trauma", stats: "84-90%", desc: "Complete remission rate", icon: "/homeImage/Container (1).svg" },
  { id: 2, title: "Depression", stats: "75%", desc: "Overall improvement", icon: "/homeImage/Container (2).svg" },
  { id: 3, title: "Anxiety Disorders", stats: "< 4 Sessions", desc: "Significant reduction", icon: "/homeImage/Container1.svg" },
  { id: 4, title: "OCD & Intrusive Thoughts", stats: "70%", desc: "Symptom reduction", icon: "/homeImage/Container (11).svg" },
  { id: 5, title: "Grief & Loss", stats: "Relief", desc: "Significant improvement", icon: "/homeImage/Container (12).svg" },
  { id: 6, title: "Self-Esteem", stats: "Healing", desc: "show significant improvement", icon: "/homeImage/Container (13).svg" },
  { id: 7, title: "Addiction", stats: "68%", desc: "significant improvement", icon: "/homeImage/Container (14).svg" },
  { id: 8, title: "Chronic Pain", stats: "95%", desc: "effect sizes (-1.12 to -6.87)", icon: "/homeImage/Container (3).svg" },
  { id: 9, title: "Performance", stats: "Rapid Relief", desc: "show significant improvement", icon: "/homeImage/Container (15).svg" },
];

const ProvenResults = () => {
  return (
    <section className="py-20 px-6 bg-[#FFF8F0] font-serif">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl text-[#2d4a3e] font-medium mb-4">
            Proven Results Across Mental Health
          </h2>
          <p className="text-[#6b8e23] italic text-sm md:text-base opacity-80">
            Evidence-based outcomes that speak for themselves
          </p>
        </motion.div>

        {/* Dynamic Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {resultsData.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -10, boxShadow: "0 20px 40px rgba(0,0,0,0.05)" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative bg-[#FBFBFC] p-10 rounded-[30px] border-5 border-[#92B09B] flex flex-col items-center text-center transition-all duration-300"
            >
              {/* ✅ Evidence Checked Badge */}
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-[#e6f4ea] border border-[#568261] text-[#568261] text-xs font-semibold px-2.5 py-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Evidence Checked
              </div>

              {/* Icon / Image Placeholder */}
              <div className="w-20 h-20  bg-[#fdfaf5] mb-6 flex items-center justify-center overflow-hidden  ">
                <img 
                  src={item.icon} 
                  alt={item.title} 
                  className="w-full h-full object-cover p-2" 
                  onError={(e) => {e.target.src = 'https://via.placeholder.com/80'}} 
                />
              </div>

              {/* Text Content */}
              <h4 className="text-xl md:text-2xl text-[#1a2e26] font-bold mb-3 tracking-tight">
                {item.title}
              </h4>
              <p className="text-[#4a7c59] text-lg font-semibold mb-1">
                {item.stats}
              </p>
              <p className="text-gray-500 text-sm leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default ProvenResults;