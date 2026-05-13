"use client";

import React from "react";
import { motion } from "framer-motion";
import { Facebook, Instagram, Twitter, Linkedin } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { name: "Home", href: "/" },
    { name: "About Us", href: "/about" },
    { name: "Terms & Conditions", href: "/terms" },
    { name: "Faq", href: "/#faq" },
    { name: "Contact Us", href: "#" },
    { name: "Privacy Policy", href: "/privacy-policy" },
  ];

  const socialLinks = [
    { icon: <Facebook size={20} />, href: "#" },
    { icon: <Instagram size={20} />, href: "#" },
    { icon: <Twitter size={20} />, href: "#" },
    { icon: <Linkedin size={20} />, href: "#" },
  ];

  return (
    <footer className="bg-[#F0F2E7] pt-20 pb-10 px-6 md:px-12 lg:px-24 border-t border-gray-200">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2">
              <img
                src="/logoImage.svg"
                alt="UK Inkind Logo"
                className="h-14 w-auto"
              />
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base max-w-sm">
              EMDR (Eye Movement Desensitisation and Reprocessing) therapy is a
              psychotherapy technique used to help people process and recover
              from traumatic memories or distressing experiences. It involves
              guided eye movements or other bilateral stimulation to reduce the
              emotional impact of these memories.
            </p>
          </motion.div>

          {/* Middle Side: Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="lg:pl-20"
          >
            <h3 className="text-xl font-bold text-[#2D312D] mb-6">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {footerLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-gray-600 hover:text-[#568261] transition-colors text-sm md:text-base font-medium"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right Side: Stay Updated */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h3 className="text-xl font-bold text-[#2D312D]">Stay Updated</h3>
            <p className="text-gray-600 text-sm md:text-base">
              Stay updated with the latest services & AI booking features.
            </p>

            <div className="space-y-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-5 py-3 rounded-xl border border-gray-300 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#568261]/20 transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 bg-[#424242] text-white rounded-xl font-semibold shadow-lg hover:bg-[#333333] transition-all"
              >
                Subscribe
              </motion.button>
            </div>

            <div className="pt-4">
              <p className="text-[#2D312D] font-bold mb-4">Follow Us</p>
              <div className="flex gap-5">
                {socialLinks.map((social, index) => (
                  <motion.a
                    key={index}
                    href={social.href}
                    whileHover={{ y: -3, color: "#568261" }}
                    className="text-gray-700 transition-colors"
                  >
                    {social.icon}
                  </motion.a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Section: Copyright */}
        <div className="pt-10 border-t border-gray-300 text-center">
          <p className="text-gray-700 font-serif text-lg">
            Copyright © {currentYear} UK Inkind Psychology Ltd.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
