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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
