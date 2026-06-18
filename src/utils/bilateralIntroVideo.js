export const BILATERAL_INTRO_VIDEO_SRC =
  "/videos/Video%203%20Your%20EMDR%20Session.mp4";

export const BILATERAL_INTRO_ROUTE =
  "/dashboard/EMDRCompanion/session/bilateral-intro";

export const BILATERAL_SETTINGS_ROUTE = "/dashboard/resources/bilateral";

export const getBilateralIntroVideoStorageKey = (journeyId = "") =>
  `bilateralIntroVideoWatched:${journeyId || "default"}`;

export const hasWatchedBilateralIntroVideo = (journeyId = "") => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getBilateralIntroVideoStorageKey(journeyId)) === "true";
};

export const markBilateralIntroVideoWatched = (journeyId = "") => {
  if (typeof window === "undefined") return;
  localStorage.setItem(getBilateralIntroVideoStorageKey(journeyId), "true");
};
