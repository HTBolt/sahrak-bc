const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
Deno.serve(async (req)=>{
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }
    if (req.method !== "POST") {
      return new Response(JSON.stringify({
        error: "Method not allowed"
      }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const { email, code, purpose } = await req.json();
    if (!email || !code || !purpose) {
      return new Response(JSON.stringify({
        error: "Missing required fields"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Get environment variables
    const sendGridApiKey = Deno.env.get("SENDGRID_API_KEY");
    const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL");
    if (!sendGridApiKey || !fromEmail) {
      console.warn("SendGrid not configured, OTP logged to console for development");
      console.log(`🔐 OTP Code for ${email}: ${code}`);
      return new Response(JSON.stringify({
        success: true,
        message: "OTP logged to console (development mode)"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Prepare email content
    const subject = `Your ${purpose} verification code`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0891b2;">Sahrak Health</h2>
        <h3>Your verification code</h3>
        <p>Use this code to complete your ${purpose}:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0891b2;">${code}</span>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          This email was sent by Sahrak Health. Please do not reply to this email.
        </p>
      </div>
    `;
    console.log(`api-${sendGridApiKey}`);
    // Send email via SendGrid API
    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: {
        "X-Smtp2go-Api-Key": `api-${sendGridApiKey}`,
        "Content-Type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        to: [
          email
        ],
        sender: fromEmail,
        subject: subject,
        html_body: htmlContent
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SendGrid API error: ${response.status} - ${errorText}`);
      return new Response(JSON.stringify({
        error: "Failed to send email",
        details: `SendGrid API error: ${response.status}`
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    console.log("OTP email sent successfully via SendGrid");
    return new Response(JSON.stringify({
      success: true,
      message: "OTP email sent successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error in send-otp-email function:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
