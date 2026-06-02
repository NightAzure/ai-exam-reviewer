export async function GET(){
    return new Response(
        JSON.stringify({ success:false, message:"API Route not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
    )
}
