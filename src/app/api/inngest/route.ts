import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

export const dynamic = "force-dynamic";

// Inngest v4: serve() returns a single handler function that handles GET/POST/PUT.
const handler = serve({
  client: inngest,
  functions,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

export async function GET(req: Request) {
  return handler(req);
}
export async function POST(req: Request) {
  return handler(req);
}
export async function PUT(req: Request) {
  return handler(req);
}
