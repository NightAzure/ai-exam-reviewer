import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { rateLimit } from "@/utils/rate-limit";

export async function POST(request: NextRequest) {
  // 5 reset attempts per 15 minutes per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`reset-password:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please wait before requesting another reset link." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as { email?: string; redirectTo?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ message: "Valid email is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: body.redirectTo,
  });

  if (error) {
    console.error("[reset-password]", error.message);
    // Return success regardless to avoid email enumeration
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: true });
}
