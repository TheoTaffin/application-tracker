import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/server/db/client";

/** Liveness + database check, used by the container healthcheck. */
export async function GET() {
  await connection(); // never prerender: this must hit the database at request time
  try {
    await db().execute(sql`select 1`);
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
