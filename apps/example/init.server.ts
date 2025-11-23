import { connectDB } from "config/db";

export async function init({ serverContext }: any) {
  const db = await connectDB();
  serverContext.db = db;

  console.log("[example] DB conectada!");
}
