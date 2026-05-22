"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import {
  IoPersonOutline,
  IoShieldCheckmarkOutline,
  IoDiamondOutline,
  IoMailOutline,
  IoSparklesOutline,
  IoFingerPrintOutline,
  IoCheckmarkCircle,
  IoCallOutline,
  IoRefreshOutline,
  IoCameraOutline,
  IoHelpCircleOutline,
  IoChatbubbleEllipsesOutline,
  IoBookOutline,
  IoHeartOutline,
} from "react-icons/io5";
import { useStoredAuth } from "@/redux/authStorage";
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
} from "@/redux/features/profile";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import PricingSection from "@/components/publicComponents/PricingSection";

const getProfilePayload = (response) => response?.data ?? response ?? null;

const getDisplayName = (profile) =>
  profile?.fullName || profile?.name || "Your profile";

const getAvatarUrl = (profile) => {
  const avatar = profile?.avatar || profile?.profilePic;

  if (avatar) {
    return avatar;
  }

  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
    getDisplayName(profile),
  )}`;
};

const formatMemberSince = (value) => {
  if (!value) {
    return "Not available";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

const getErrorMessage = (error) => {
  if (!error) {
    return "";
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error?.message === "string") {
    return error.message;
  }

  if (typeof error?.error === "string") {
    return error.error;
  }

  if (typeof error?.data?.message === "string") {
    return error.data.message;
  }

  if (typeof error?.data?.data?.message === "string") {
    return error.data.data.message;
  }

  if (typeof error?.data?.error === "string") {
    return error.data.error;
  }

  if (typeof error?.data?.error?.message === "string") {
    return error.data.error.message;
  }

  return "Something went wrong while loading your profile.";
};

const createFormState = (profile) => ({
  fullName: profile?.fullName || profile?.name || "",
  phoneNumber: profile?.phoneNumber || "",
});

const getCompletionLabel = (profile) =>
  profile?.isProfileCompleted ? "Completed" : "Incomplete";

const getVerificationLabel = (profile) =>
  profile?.isVerified ? "Verified" : "Pending";

const MAX_CHARS = 100;

function SupportForm({ token }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      setErrorMsg("Please fill out both fields.");
      return;
    }
    
    setIsSending(true);
    setSent(false);
    setErrorMsg("");
    
    try {
      const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
      const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
      
      const response = await fetch(`${baseUrl}/api/support/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: subject,
          message: message,
          priority: "medium",
        }),
      });

      const result = await response.json();
      
      if (response.ok && result?.success) {
        setSent(true);
        setSubject("");
        setMessage("");
        setTimeout(() => setSent(false), 3000);
      } else {
        let msg = "Failed to submit ticket.";
        if (typeof result?.message === "string") {
          msg = result.message;
        } else if (result?.error && typeof result.error === "object") {
          msg = result.error.message || msg;
        } else if (typeof result?.error === "string") {
          msg = result.error;
        }
        setErrorMsg(msg);
      }
    } catch (e) {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-[40px] border border-stone-100 bg-white/30 p-8 shadow-sm">
      <h3 className="text-lg font-bold text-stone-800 mb-6">Help & Support</h3>

      <div className="space-y-4 font-sans">
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Tell us your problem..."
          className="w-full rounded-[16px] border border-stone-200 bg-white px-5 py-3.5 text-sm text-stone-700 outline-none placeholder:text-stone-400 transition-all focus:border-[#5a7c5a]/30 focus:ring-2 focus:ring-[#5a7c5a]/10"
        />

        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) setMessage(e.target.value);
            }}
            placeholder="e.g. My app is not working..."
            rows={5}
            className="w-full resize-none rounded-[16px] border border-stone-200 bg-white px-5 py-4 text-sm text-stone-700 outline-none placeholder:text-stone-400 transition-all focus:border-[#5a7c5a]/30 focus:ring-2 focus:ring-[#5a7c5a]/10"
          />
          <div className="flex items-center justify-end gap-1 mt-1 pr-1 text-xs text-stone-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{message.length}/{MAX_CHARS}</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {errorMsg}
        </div>
      )}

      {sent && (
        <div className="mt-4 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Your message has been sent successfully!
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={isSending || (!subject.trim() || !message.trim())}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-[16px] bg-stone-900 py-3.5 text-sm font-bold text-white transition-all hover:bg-stone-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSending ? "Sending..." : "Send"}
        {!isSending && (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { token } = useStoredAuth();
  const authUser = useSelector(selectCurrentUser);
  const [activeTab, setActiveTab] = useState("profile");
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [draftState, setDraftState] = useState({
    profileKey: "",
    values: createFormState(null),
  });
  const [formMessage, setFormMessage] = useState({
    type: "",
    text: "",
  });

  const {
    data,
    error,
    isFetching,
    isLoading,
    refetch,
  } = useGetProfileQuery(undefined, {
    skip: !token,
  });
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();

  const profile = getProfilePayload(data) || authUser;
  const queryErrorMessage = error ? getErrorMessage(error) : "";
  const profileKey = [
    profile?.id || "",
    profile?.fullName || profile?.name || "",
    profile?.phoneNumber || "",
    profile?.avatar || profile?.profilePic || "",
  ].join("|");
  const formData =
    draftState.profileKey === profileKey
      ? draftState.values
      : createFormState(profile);

  useEffect(() => {
    return () => {
      if (selectedAvatar?.previewUrl) {
        URL.revokeObjectURL(selectedAvatar.previewUrl);
      }
    };
  }, [selectedAvatar?.previewUrl]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setDraftState((current) => ({
      profileKey,
      values: {
        ...(current.profileKey === profileKey
          ? current.values
          : createFormState(profile)),
        [name]: value,
      },
    }));

    if (formMessage.text) {
      setFormMessage({
        type: "",
        text: "",
      });
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFormMessage({
        type: "error",
        text: "Please select a valid image file.",
      });
      event.target.value = "";
      return;
    }

    setSelectedAvatar({
      file,
      previewUrl: URL.createObjectURL(file),
    });
    setFormMessage({
      type: "",
      text: "",
    });
    event.target.value = "";
  };

  const handleReset = () => {
    setDraftState({
      profileKey,
      values: createFormState(profile),
    });
    setSelectedAvatar(null);
    setFormMessage({
      type: "",
      text: "",
    });
  };

  const buildProfilePayload = (fileFieldName) => {
    if (!selectedAvatar?.file) {
      return {
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
      };
    }

    const payload = new FormData();

    payload.append("fullName", formData.fullName.trim());
    payload.append("phoneNumber", formData.phoneNumber.trim());
    payload.append(fileFieldName, selectedAvatar.file);

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      fullName: formData.fullName.trim(),
      phoneNumber: formData.phoneNumber.trim(),
    };

    if (!payload.fullName) {
      setFormMessage({
        type: "error",
        text: "Full name is required.",
      });
      return;
    }

    try {
      await updateProfile(
        selectedAvatar?.file ? buildProfilePayload("profilePic") : payload,
      ).unwrap();
      setFormMessage({
        type: "success",
        text: "Profile updated successfully.",
      });
      setSelectedAvatar(null);
    } catch (saveError) {
      if (selectedAvatar?.file) {
        try {
          await updateProfile(buildProfilePayload("avatar")).unwrap();
          setFormMessage({
            type: "success",
            text: "Profile updated successfully.",
          });
          setSelectedAvatar(null);
          return;
        } catch (avatarFallbackError) {
          setFormMessage({
            type: "error",
            text: getErrorMessage(avatarFallbackError),
          });
          return;
        }
      }

      setFormMessage({
        type: "error",
        text: getErrorMessage(saveError),
      });
    }
  };

  const hasChanges =
    formData.fullName.trim() !== (profile?.fullName || profile?.name || "").trim() ||
    formData.phoneNumber.trim() !== (profile?.phoneNumber || "").trim() ||
    Boolean(selectedAvatar?.file);

  const avatarUrl = selectedAvatar?.previewUrl || getAvatarUrl(profile);
  const memberSince = formatMemberSince(profile?.memberSince);

  return (
    <div className="min-h-screen rounded-2xl bg-[#ffff]/20 p-4 font-serif backdrop-blur-sm md:p-10">
      <div className="pointer-events-none absolute right-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-[#5a7c5a]/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-5%] left-[-5%] h-[400px] w-[400px] rounded-full bg-[#81c784]/10 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-[1200px]">
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h1 className="bg-gradient-to-r from-stone-800 to-stone-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              Profile workspace
            </h1>
            <p className="mt-1 font-sans text-xs font-bold uppercase tracking-[3px] text-stone-500">
              Connected Profile Workspace
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            {/* <button
              type="button"
              onClick={() => refetch()}
              className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-500 shadow-sm transition hover:text-[#5a7c5a]"
            >
              <IoRefreshOutline size={16} />
              {isFetching ? "Refreshing..." : "Refresh"}
            </button> */}

            <div className="flex gap-1 rounded-[24px] border border-stone-200/50 bg-stone-100 p-1.5">
              {["profile", "security", "support"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`relative rounded-[20px] px-6 py-3 text-sm font-bold capitalize transition-all duration-500 ${activeTab === tab
                    ? "text-white"
                    : "text-stone-400 hover:text-stone-600"
                    }`}
                >
                  {activeTab === tab ? (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-[20px] bg-[#5a7c5a] shadow-[0_8px_20px_rgba(90,124,90,0.3)]"
                    />
                  ) : null}
                  <span className="relative z-10 flex items-center gap-2">
                    {tab === "profile" ? (
                      <IoPersonOutline />
                    ) : tab === "security" ? (
                      <IoShieldCheckmarkOutline />
                    ) : (
                      <IoHelpCircleOutline />
                    )}
                    {tab}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {queryErrorMessage && profile ? (
          <div className="mb-6 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 font-sans text-sm text-amber-700">
            {queryErrorMessage}
          </div>
        ) : null}

        {!profile && isLoading ? (
          <div className="rounded-[40px] border border-stone-100 bg-white/90 p-10 text-center shadow-sm">
            <p className="font-sans text-sm font-semibold text-stone-500">
              Loading your profile...
            </p>
          </div>
        ) : null}

        {!profile && !isLoading ? (
          <div className="rounded-[40px] border border-rose-100 bg-white/90 p-10 text-center shadow-sm">
            <p className="font-sans text-sm font-semibold text-rose-500">
              {queryErrorMessage || "We could not load your profile right now."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-full bg-[#5a7c5a] px-5 py-2 font-sans text-sm font-bold text-white"
            >
              Try again
            </button>
          </div>
        ) : null}

        {profile ? (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative overflow-hidden rounded-[40px] border border-stone-100 bg-white/30 p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.04)] lg:col-span-4"
            >
              <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-[100px] bg-[#5a7c5a]/5" />

              <div className="relative mb-6 inline-block">
                <div className="relative h-32 w-32 overflow-hidden rounded-[45px] border-4 border-white shadow-2xl transition-transform duration-500 group-hover:rotate-3">
                  <Image
                    src={avatarUrl}
                    alt={getDisplayName(profile)}
                    fill
                    unoptimized
                    sizes="128px"
                    className="object-cover"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-100 bg-white text-amber-500 shadow-xl">
                  <IoDiamondOutline size={20} />
                </div>
              </div>

              <h2 className="mb-1 text-2xl font-bold text-stone-800">
                {getDisplayName(profile)}
              </h2>
              <p className="mb-6 inline-block rounded-full bg-[#5a7c5a]/5 px-4 py-1 font-sans text-xs font-bold uppercase tracking-widest text-[#5a7c5a]">
                {profile?.role || "user"}
              </p>

              <div className="space-y-4 rounded-[28px] border border-stone-100 bg-stone-50/60 p-5 text-left font-sans">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-2xl bg-white p-3 text-blue-500 shadow-sm">
                    <IoMailOutline size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                      Email Address
                    </p>
                    <p className="mt-1 break-all text-sm font-semibold text-stone-700">
                      {profile?.email || "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-2xl bg-white p-3 text-emerald-500 shadow-sm">
                    <IoCallOutline size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                      Phone Number
                    </p>
                    <p className="mt-1 text-sm font-semibold text-stone-700">
                      {profile?.phoneNumber?.trim() || "Not added yet"}
                    </p>
                  </div>
                </div>
              </div>

              <div className=" grid grid-cols-2 gap-4 border-t border-stone-50 pt-8 font-sans">
                {/* <div className="text-left">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                    Member Since
                  </p>
                  <p className="text-sm font-bold tracking-tight text-stone-800">
                    {memberSince}
                  </p>
                </div>
                <div className="text-right">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                    Account State
                  </p>
                  <p className="text-sm font-bold tracking-tight text-[#5a7c5a]">
                    {getCompletionLabel(profile)}
                  </p>
                </div> */}
                <div className="col-span-2 mt-2 rounded-[24px] bg-[#5a7c5a]/5 py-4 text-center">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-stone-600">
                    Subscription Plan
                  </p>
                  <p className="text-base font-bold tracking-tight text-[#5a7c5a]">
                    {profile?.SubscriptionPlan || "No Active Plan"}
                  </p>
                </div>
              </div>
            </motion.div>

            <div className="lg:col-span-8">
              <AnimatePresence mode="wait">
                {activeTab === "profile" ? (
                  <motion.div
                    key="profile-grid"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="grid grid-cols-1 gap-6 md:grid-cols-2"
                  >
                    <form
                      onSubmit={handleSubmit}
                      className="rounded-[40px] border border-stone-100/50 bg-gradient-to-br from-white/30 to-stone-50/30 p-8 shadow-sm md:col-span-2"
                    >
                      <div className="mb-8 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 shadow-inner">
                            <IoSparklesOutline size={20} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-stone-800">
                              Profile Details
                            </h3>
                            <p className="mt-1 font-sans text-xs text-stone-600">
                              Update the information used across your dashboard.
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-[#5a7c5a] shadow-sm">
                          {isFetching ? "Syncing..." : "Live API"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <label className="ml-2 font-sans text-[10px] font-bold uppercase tracking-widest text-stone-600">
                            Profile Photo
                          </label>
                          <div className="flex flex-col gap-4 rounded-[28px] border border-stone-100 bg-stone-50/70 p-5 md:flex-row md:items-center">
                            <div className="relative h-20 w-20 overflow-hidden rounded-[28px] border border-white bg-white shadow-sm">
                              <Image
                                src={avatarUrl}
                                alt={getDisplayName(profile)}
                                fill
                                unoptimized
                                sizes="80px"
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="font-sans text-sm font-semibold text-stone-700">
                                Upload a new profile image
                              </p>
                              <p className="mt-1 font-sans text-xs text-stone-400">
                                JPG, PNG, WEBP or any standard image file.
                              </p>
                              {selectedAvatar?.file ? (
                                <p className="mt-2 font-sans text-xs font-semibold text-[#5a7c5a]">
                                  Selected: {selectedAvatar.file.name}
                                </p>
                              ) : null}
                            </div>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 font-sans text-xs font-bold text-stone-600 shadow-sm transition hover:text-[#5a7c5a]">
                              <IoCameraOutline size={16} />
                              Change Photo
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="ml-2 font-sans text-[10px] font-bold uppercase tracking-widest text-stone-600">
                            Full Name
                          </label>
                          <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            placeholder="Enter your full name"
                            className="w-full rounded-[20px] border-2 border-transparent bg-stone-50/70 p-4 font-sans text-sm outline-none transition-all shadow-inner focus:border-[#5a7c5a]/20 focus:bg-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="ml-2 font-sans text-[10px] font-bold uppercase tracking-widest text-stone-600">
                            Phone Number
                          </label>
                          <input
                            type="text"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            placeholder="Add your phone number"
                            className="w-full rounded-[20px] border-2 border-transparent bg-stone-50/70 p-4 font-sans text-sm outline-none transition-all shadow-inner focus:border-[#5a7c5a]/20 focus:bg-white"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <label className="ml-2 font-sans text-[10px] font-bold uppercase tracking-widest text-stone-600">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={profile?.email || ""}
                            readOnly
                            className="w-full cursor-not-allowed rounded-[20px] border border-stone-100 bg-stone-100/80 p-4 font-sans text-sm text-stone-500 outline-none"
                          />
                        </div>
                      </div>

                      {formMessage.text ? (
                        <div
                          className={`mt-6 rounded-[24px] px-4 py-3 font-sans text-sm ${formMessage.type === "success"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-rose-200 bg-rose-50 text-rose-600"
                            }`}
                        >
                          {formMessage.text}
                        </div>
                      ) : null}

                      <div className="mt-6 flex flex-col gap-4 md:flex-row">
                        <button
                          type="submit"
                          disabled={isSaving || !hasChanges}
                          className="flex-1 rounded-[20px] bg-[#5a7c5a] py-4 font-sans text-sm font-bold text-white shadow-lg shadow-[#5a7c5a]/20 transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          type="button"
                          onClick={handleReset}
                          disabled={isSaving || !hasChanges}
                          className="rounded-[20px] bg-stone-100 px-10 py-4 font-sans text-sm font-bold text-stone-500 transition-all hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reset
                        </button>
                      </div>
                    </form>

                    {/* <div className="rounded-[40px] border border-stone-100 bg-white p-8 shadow-sm">
                      <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
                          <IoCheckmarkCircle size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-stone-800">
                            Account Signals
                          </h3>
                          <p className="mt-1 font-sans text-xs text-stone-400">
                            Live status from `GET /api/profile`
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 font-sans text-sm">
                        <div className="flex items-center justify-between rounded-[24px] bg-stone-50 px-5 py-4">
                          <span className="text-stone-500">Verification</span>
                          <span className="font-bold text-[#5a7c5a]">
                            {getVerificationLabel(profile)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-[24px] bg-stone-50 px-5 py-4">
                          <span className="text-stone-500">Profile Completion</span>
                          <span className="font-bold text-[#5a7c5a]">
                            {getCompletionLabel(profile)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-[24px] bg-stone-50 px-5 py-4">
                          <span className="text-stone-500">Auth Provider</span>
                          <span className="font-bold capitalize text-stone-700">
                            {profile?.authProvider || "email"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-[24px] bg-stone-50 px-5 py-4">
                          <span className="text-stone-500">Role</span>
                          <span className="font-bold capitalize text-stone-700">
                            {profile?.role || "user"}
                          </span>
                        </div>
                      </div>
                    </div> */}

                    {/* <div className="rounded-[40px] bg-[#5a7c5a] p-8 text-white shadow-lg shadow-[#5a7c5a]/20">
                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                        <IoDiamondOutline size={30} />
                      </div>
                      <h4 className="text-lg font-bold">Profile Summary</h4>
                      <p className="mt-2 font-sans text-sm text-white/70">
                        Your profile page now reads from `GET /api/profile` and
                        updates name, phone, and photo via `PATCH /api/profile`.
                      </p>
                      <div className="mt-6 space-y-3 font-sans text-sm">
                        <div className="flex items-center justify-between rounded-[20px] bg-white/10 px-4 py-3">
                          <span>Displayed Name</span>
                          <span className="font-semibold">
                            {getDisplayName(profile)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-[20px] bg-white/10 px-4 py-3">
                          <span>Member Since</span>
                          <span className="font-semibold">{memberSince}</span>
                        </div>
                      </div>
                    </div> */}
                  </motion.div>
                ) : activeTab === "security" ? (
                  <motion.div
                    key="security-grid"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="relative overflow-hidden rounded-[40px] border border-stone-100 bg-white/30 p-6 shadow-sm">
                      <div className="absolute right-0 top-0 rotate-12 p-8 opacity-[0.03]">
                        <IoFingerPrintOutline size={120} />
                      </div>

                      <div className="mb-8 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                          <IoMailOutline size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-stone-800">
                            Account Email
                          </h3>
                          <p className="mt-1 font-sans text-xs text-stone-600">
                            Read-only identity from your account profile
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 rounded-[24px] border border-stone-100 bg-stone-50/80 p-6 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="mb-1 break-all font-sans text-sm font-bold text-stone-700">
                            {profile?.email || "Not available"}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                            {profile?.isVerified
                              ? "Verified identity"
                              : "Verification pending"}
                          </p>
                        </div>
                        <div className="rounded-full bg-white px-4 py-1.5 text-[10px] font-bold shadow-sm">
                          Locked System Property
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[40px] border border-stone-100 bg-white/30 p-6 shadow-sm">
                      <div className="mb-8 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                          <IoShieldCheckmarkOutline size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-stone-800">
                            Security Overview
                          </h3>
                          <p className="mt-1 font-sans text-xs text-stone-600">
                            This screen is connected only to the profile API for now.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 font-sans text-sm">
                        <div className="rounded-[24px] border border-stone-100 bg-stone-50 px-5 py-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">
                            Current Auth Provider
                          </p>
                          <p className="mt-2 font-semibold capitalize text-stone-700">
                            {profile?.authProvider || "email"}
                          </p>
                        </div>

                        <div className="rounded-[24px] border border-stone-100 bg-stone-50 px-5 py-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">
                            Password Management
                          </p>
                          <p className="mt-2 text-stone-600">
                            No password update endpoint was provided yet, so this
                            page shows your live account data without a fake save
                            action.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="support-grid"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <SupportForm token={token} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : null}

        <PricingSection compact={true} activePlanName={profile?.SubscriptionPlan} />
      </div>
    </div>
  );
}
