"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Evidence", href: "/evidence" },
    { name: "How it Works", href: "/how-it-works" },

  ];

  return (
    <nav className="bg-white shadow-sm w-full sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
              <Image
                src="/logoImage.svg"
                alt="UK INKIND Logo"
                width={180}
                height={60}
                priority
                className="h-16 w-auto object-contain"
              />
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`${pathname === link.href
                  ? "text-[#56825e] font-bold"
                  : "text-gray-800 font-medium"
                  } hover:text-[#56825e] transition-colors`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden md:block">
            <Link href="/authentication/login">
              <button className=" px-8 py-2
  text-[#FFFFFF]
  text-lg
  font-semibold
  rounded-2xl
  border-[2px] border-[#2b2b2b]
  bg-gradient-to-b from-[#6f8f79] to-[#3e6f55]
  shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),_0_2px_0_#1f1f1f]
  hover:brightness-110
  active:translate-y-[2px]
  active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),_0_2px_0_#1f1f1f]
  transition-all duration-150">
                Start Healing
              </button>
            </Link>
          </div>

          {/* Hamburger Icon Animation */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 outline-none"
            >
              <motion.div
                animate={{ rotate: isOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isOpen ? <X size={28} /> : <Menu size={28} />}
              </motion.div>
            </button>
          </div>
        </div>
      </div>

      {/* Animated Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden bg-white border-t border-gray-100 absolute w-full left-0 shadow-lg z-40"
          >
            <div className="px-4 pt-4 pb-8 space-y-2">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`block px-4 py-3 text-base font-medium rounded-xl hover:bg-gray-50 hover:text-[#56825e] ${pathname === link.href
                      ? "text-[#56825e] bg-gray-50 bg-opacity-50"
                      : "text-gray-800"
                      }`}
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}
              <div className="pt-4 px-4">
                <Link href="/authentication/login">
                  <button className="w-full bg-[#56825e] text-white px-6 py-3.5 rounded-xl font-medium shadow-[4px_4px_0px_0px_rgba(50,50,50,0.8)] border-2 border-[#323232] active:shadow-[2px_2px_0px_0px_rgba(50,50,50,0.8)] active:translate-x-[2px] active:translate-y-[2px]">
                    Start Healing
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
