"use client";
import React from "react";
import { motion } from "framer-motion";

const phases = [
  {
    id: 1,
    title: "Phase 1: History & Planning",
    desc: "Mapping your story and identifying memories",
    side: "right",
  },
  {
    id: 2,
    title: "Phase 2: Preparation",
    desc: "Learning coping techniques and building toolkit",
    side: "left",
  },
  {
    id: 3,
    title: "Phase 3: Assessment",
    desc: "Activating the target memory and identifying components",
    side: "right",
  },
  {
    id: 4,
    title: "Phase 4: Desensitisation",
    desc: "Processing the memory using bilateral stimulation",
    side: "left",
  },
  {
    id: 5,
    title: "Phase 5: Installation",
    desc: "Strengthening positive beliefs to replace negative ones",
    side: "right",
  },
  {
    id: 6,
    title: "Phase 6: Body Scan",
    desc: "Identifying and releasing lingering physical tension",
    side: "left",
  },
  {
    id: 7,
    title: "Phase 7: Closure",
    desc: "Ensuring stability at the end of every session",
    side: "right",
  },
  {
    id: 8,
    title: "Phase 8: Reevaluation",
    desc: "Reviewing progress and planning future work",
    side: "left",
  },
];

const EMDRJourney = () => {
  return (
    <section
      style={{
        backgroundImage: `url('/homeImage/Phase (1).png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        padding: "80px 20px",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "serif",
      }}
    >
      {/* --- Header Section --- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        style={{ textAlign: "center", marginBottom: "60px" }}
      >
        <h2 style={{ fontSize: "2.5rem", color: "#1a332a", margin: 0 }}>
          The 8-Phase EMDR Journey
        </h2>
        <p style={{ color: "#4a7c59", fontStyle: "italic", marginTop: "10px" }}>
          A structured path designed for safety and lasting transformation
        </p>
      </motion.div>

      <div style={{ position: "relative", maxWidth: "900px", width: "100%" }}>
        <motion.div
          initial={{ height: 0 }}
          whileInView={{ height: "100%" }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            width: "6px",
            backgroundColor: "#6b7280",
            zIndex: 1,
          }}
        />

        {phases.map((phase, index) => (
          <div
            key={phase.id}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              marginBottom: "45px",
              position: "relative",
            }}
          >
            {/* Left Card Area */}
            <div style={{ width: "40%", textAlign: "right" }}>
              {phase.side === "left" && (
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  style={{
                    backgroundColor: "white",
                    padding: "15px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  <h4
                    style={{ margin: 0, color: "#4a7c59", fontSize: "1.1rem" }}
                  >
                    {phase.title}
                  </h4>
                  <p
                    style={{
                      margin: "5px 0 0 0",
                      fontSize: "0.85rem",
                      color: "#666",
                    }}
                  >
                    {phase.desc}
                  </p>
                </motion.div>
              )}
            </div>

            <div
              style={{
                width: "100px",
                display: "flex",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                animate={{
                  boxShadow: [
                    "0 0 0px #4a7c59",
                    "0 0 15px #4a7c59",
                    "0 0 0px #4a7c59",
                  ],
                }}
                transition={{
                  boxShadow: { repeat: Infinity, duration: 2 },
                  scale: { type: "spring" },
                }}
                style={{
                  width: "45px",
                  height: "45px",
                  backgroundColor: "white",
                  border: "2px solid #4a7c59",
                  borderRadius: "50%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontWeight: "bold",
                  color: "#333",
                  fontSize: "1.1rem",
                }}
              >
                {phase.id}
              </motion.div>
            </div>

            {/* Right Card Area */}
            <div style={{ width: "40%", textAlign: "left" }}>
              {phase.side === "right" && (
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  style={{
                    backgroundColor: "white",
                    padding: "15px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  <h4
                    style={{ margin: 0, color: "#4a7c59", fontSize: "1.1rem" }}
                  >
                    {phase.title}
                  </h4>
                  <p
                    style={{
                      margin: "5px 0 0 0",
                      fontSize: "0.85rem",
                      color: "#666",
                    }}
                  >
                    {phase.desc}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* --- Footer Section --- */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        style={{
          marginTop: "70px",
          backgroundColor: "rgba(215, 225, 215, 0.95)",
          padding: "40px",
          borderRadius: "20px",
          maxWidth: "800px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          zIndex: 10,
        }}
      >
        <h3
          style={{ margin: "0 0 10px 0", color: "#1a332a", fontSize: "1.8rem" }}
        >
          Built by Someone Who Gets It
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "1.1rem",
            color: "#444",
            lineHeight: "1.6",
          }}
        >
          Created by <strong>Dr Jaime Jonsson</strong>, a clinical psychologist
          who believes therapy shouldn t feel like therapy.
        </p>
      </motion.div>

      {/* Responsive Styles */}
      <style jsx>{`
        @media (max-width: 600px) {
          div[style*="left: 50%"] {
            left: 30px !important;
            transform: none !important;
          }
          div[style*="justifyContent: 'center'"] {
            justify-content: flex-start !important;
          }
          div[style*="width: 100px"] {
            width: 60px !important;
            z-index: 10 !important;
          }
          div[style*="width: 40%"] {
            width: 80% !important;
            text-align: left !important;
          }
          div[style*="textAlign: 'right'"] {
            display: none;
          }
        }
      `}</style>
    </section>
  );
};

export default EMDRJourney;
