import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

export const dynamic = "force-dynamic";

// Inngest v4: serve() returns a Next.js App Router handler function.
// Use it directly as the route export.
const handler = serve({
  client: inngest,
  functions,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

export { handler as GET, handler as POST, handler as PUT };
