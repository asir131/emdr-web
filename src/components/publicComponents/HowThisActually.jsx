"use client";
import React from "react";
import { motion } from "framer-motion";

const HowThisActually = ({ desktopImage = "/homeImage/image1.png" }) => {
  const steps = [
    {
      img: "/homeImage/Vector (1).svg",
      title: "Session 1-2: Understanding Your Story",
      desc: "Start with our formulation tool which maps out your experiences, identifies patterns, and helps you understand your triggers.",
    },
    {
      img: "/homeImage/Frame (1).svg",
      title: "Session 3-6: Processing & Practicing",
      desc: "Work through EMDR exercises at your own pace. Play brain games when you're ready. Listen to guided journeys before bed.",
    },
    {
      img: "/homeImage/Frame (2).svg",
      title: "Ongoing: Integration & Growth",
      desc: "Use homework exercises daily. Track your progress. Celebrate small wins. Know that your subscription is literally funding someone else's healing.",
    },
  ];

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <section className="relative w-full py-10  flex flex-col items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 z-0 hidden md:block bg-cover bg-center bg-no-repeat opacity-30"
        style={{
          backgroundImage: `url(${desktopImage})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col items-center px-6">
        {/* Section Title */}
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-serif text-center text-[#0F1912] pt-10 mb-5"
        >
          How This Actually Works
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-lg md:text-xl font-serif text-center text-[#4A7C59] mb-5"
        >
          A structured, step-by-step journey to healing at your own pace
        </motion.p>

        {/* Steps Grid */}
        <div className=" md:flex gap-12 mb-20">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="flex flex-col items-center text-center group"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-white shadow-md border border-gray-50 flex items-center justify-center mb-8 overflow-hidden p-5 transition-all duration-300 group-hover:shadow-xl"
              >
                <img
                  src={step.img}
                  alt={step.title}
                  className="w-full h-full object-contain"
                />
              </motion.div>

              <h3 className="text-xl md:text-2xl font-serif text-[#000000] mb-4">
                {step.title}
              </h3>
              <p className="text-[#000000] text-[16px]">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowThisActually;
