import { baseApi } from "./baseApi";

export const subscriptionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlans: builder.query({
      query: () => "/subscriptions/plans",
      providesTags: ["Subscription"],
    }),
    getMySubscription: builder.query({
      query: () => "/subscriptions/my",
      providesTags: ["Subscription"],
    }),
    subscribe: builder.mutation({
      query: (data) => ({
        url: "/subscriptions/subscribe",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Subscription"],
    }),
    applyForCommunityAccess: builder.mutation({
      query: (planId) => ({
        url: "/api/subscriptions/apply",
        method: "POST",
        body: { planId },
      }),
      invalidatesTags: ["Subscription"],
    }),
  }),
});

export const {
  useGetPlansQuery,
  useGetMySubscriptionQuery,
  useSubscribeMutation,
  useApplyForCommunityAccessMutation,
} = subscriptionApi;
