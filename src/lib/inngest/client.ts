import { Inngest } from "inngest";

// Cirkle Inngest client — background jobs for the superapp.
export const inngest = new Inngest({
  id: "cirkle-superapp",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
