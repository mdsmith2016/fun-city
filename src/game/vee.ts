/** Vee's lines. Placeholder copy: edit freely, this is the only place the text lives. */
export type VeeEvent = 'start' | 'rts' | 'season1';

export const VEE_MESSAGES: Record<VeeEvent, string> = {
  start:
    "Hello. I'm Vee. I'll be supporting you through the roadmap. Please collect every Jira ticket, time estimate and Miro board in this phase. I'm sure nothing will go wrong.",
  rts:
    "MVP delivered, on time and under budget. Phase: RTS is now unlocked. I'm afraid I can't let you skip the next one.",
  season1:
    "Phase: RTS is complete. Season 1 begins now. Scope has been refreshed, and so has your wardrobe. This is entirely normal.",
};
