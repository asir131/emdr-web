import { getApiHeaders } from "@/utils/apiHeaders";

/**
 * Updates the session progress for a given journey.
 * 
 * @param {Object} params
 * @param {string} params.baseUrl - The base URL of the API.
 * @param {string} params.token - The authentication token.
 * @param {string} params.journeyId - The ID of the active journey.
 * @param {number} [params.totalSession=10] - The total number of sessions in the journey.
 * @param {number} params.compledSession - The current session number that was completed.
 */
export const updateSessionProgress = async ({
  baseUrl,
  token,
  journeyId,
  totalSession = 10,
  compledSession,
}) => {
  if (!journeyId || !token || !baseUrl) {
    console.warn("Missing required parameters for updating session progress", { journeyId, token, baseUrl });
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/api/session-progress/update`, {
      method: "POST",
      headers: getApiHeaders({
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }),
      body: JSON.stringify({
        journeyId,
        totalSession,
        compledSession,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error updating session progress:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Checks if a user has access to a specific session based on their progress.
 * 
 * @param {Object} params
 * @param {string} params.baseUrl
 * @param {string} params.token
 * @param {string} params.journeyId
 * @param {number} params.requiredSession - The session number the user is trying to access.
 * @returns {Object} { allowed: boolean, redirectTo: string | null }
 */
export const checkSessionAccess = async ({
  baseUrl,
  token,
  journeyId,
  requiredSession,
}) => {
  if (!journeyId || !token || !baseUrl) return { allowed: false, redirectTo: "/dashboard" };

  try {
    const response = await fetch(`${baseUrl}/api/session-progress/${journeyId}`, {
      cache: "no-store",
      headers: getApiHeaders({
        Authorization: `Bearer ${token}`,
      }),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      return { allowed: false, redirectTo: "/dashboard" };
    }

    const completedCount = result.data?.details?.completedSessions || 0;

    // Logic: To access session N, user must have completed at least N-1 sessions.
    // Example: To access Session 2, completedCount must be >= 1.
    if (completedCount >= requiredSession - 1) {
      return { allowed: true, redirectTo: null };
    }

    // If not allowed, determine where they SHOULD be
    let redirectTo = "/dashboard/EMDRCompanion/session"; // Default to Session 1
    if (completedCount === 1) redirectTo = "/dashboard/EMDRCompanion/session/next";
    if (completedCount === 2) redirectTo = "/dashboard/EMDRCompanion/session/next/calm-space";
    if (completedCount === 3) redirectTo = "/dashboard/EMDRCompanion";
    if (completedCount === 4) redirectTo = "/dashboard/EMDRCompanion/session/session5";
    if (completedCount >= 5) redirectTo = "/dashboard/resources/bilateral";

    return { allowed: false, redirectTo };
  } catch (error) {
    console.error("Error checking session access:", error);
    return { allowed: false, redirectTo: "/dashboard" };
  }
};
