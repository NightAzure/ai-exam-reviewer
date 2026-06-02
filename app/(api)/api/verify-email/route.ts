export function GET() {
    return new Response(
        JSON.stringify({ success: true,message: "OTP verification endpoint is working!" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
    );
}
