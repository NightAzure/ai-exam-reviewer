import { supabase } from "@/utils/supabase/admin";

// Define the columns you want to select based on the UserPublic type.
// This prevents over-fetching and ensures you only get public data.
const PUBLIC_USER_COLUMNS = "id, username, first_name, second_name, role";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  // Request is currently unused but kept here to match the route handler signature.
  void request;

  if (!userId) {
    return new Response(JSON.stringify({ success:false,message: "User ID is required" }), {
      status: 400,
    });
  }
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(PUBLIC_USER_COLUMNS)
    .eq("id", userId)
    .single();

  if (error) {
    return new Response(JSON.stringify({ success:false, message: error.message }), { status: 404 });
  }
  return new Response(JSON.stringify({success:true,data:profile}), { status: 200 });
}
