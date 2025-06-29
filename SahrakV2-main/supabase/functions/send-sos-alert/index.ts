import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight request
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    // Only allow POST requests
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

    // Parse request body
    const { userId, emergencyInfo, caregiverIds } = await req.json();

    if (!userId || !emergencyInfo) {
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase environment variables not set");
      return new Response(JSON.stringify({
        error: "Server configuration error"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log the SOS alert to the database
    const { data: alertData, error: alertError } = await supabase
      .from('sos_alerts')
      .insert([{
        user_id: userId,
        emergency_info: emergencyInfo,
        caregiver_ids: caregiverIds,
        status: 'sent',
        location_data: emergencyInfo.location,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (alertError) {
      console.error("Error logging SOS alert:", alertError);
      return new Response(JSON.stringify({
        error: "Failed to log SOS alert"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    // Get caregiver information
    const { data: caregivers, error: caregiverError } = await supabase
      .from('caregivers')
      .select('*')
      .in('id', caregiverIds);

    if (caregiverError) {
      console.error("Error fetching caregivers:", caregiverError);
      return new Response(JSON.stringify({
        error: "Failed to fetch caregiver information"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    // Send emails to caregivers
    const emailPromises = caregivers.map(async (caregiver) => {
      try {
        await sendSOSEmail(caregiver.email, emergencyInfo);
        return { email: caregiver.email, success: true };
      } catch (error) {
        console.error(`Error sending email to ${caregiver.email}:`, error);
        return { email: caregiver.email, success: false, error };
      }
    });

    const emailResults = await Promise.all(emailPromises);

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: "SOS alert sent successfully",
      alertId: alertData.id,
      emailResults
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error("Error in send-sos-alert function:", error);
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

// Function to send SOS email
async function sendSOSEmail(email: string, emergencyInfo: any): Promise<void> {
  // Get environment variables
  const sendGridApiKey = Deno.env.get("SENDGRID_API_KEY");
  const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@sahrak.com";

  if (!sendGridApiKey) {
    console.warn("SendGrid not configured, SOS email logged to console for development");
    console.log(`🚨 SOS Alert for ${email}:`, createEmergencyMessage(emergencyInfo));
    return;
  }

  // Prepare email content
  const subject = `🚨 EMERGENCY SOS ALERT - ${emergencyInfo.user.name} needs help!`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
      <div style="background-color: #dc3545; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; border-radius: 8px 8px 0 0;">
        🚨 EMERGENCY SOS ALERT 🚨
      </div>
      <div style="background-color: white; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #dee2e6; border-top: none;">
        <p style="font-size: 18px; font-weight: bold;">${emergencyInfo.user.name} has triggered an SOS alert and needs immediate assistance!</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #721c24;">📍 Location Information</h3>
          ${emergencyInfo.location.address ? 
            `<p><strong>Address:</strong> ${emergencyInfo.location.address}</p>` : 
            ''}
          ${emergencyInfo.location.latitude && emergencyInfo.location.longitude ? 
            `<p><strong>Coordinates:</strong> ${emergencyInfo.location.latitude.toFixed(6)}, ${emergencyInfo.location.longitude.toFixed(6)}</p>
             <p><a href="https://maps.google.com/?q=${emergencyInfo.location.latitude},${emergencyInfo.location.longitude}" style="color: #0d6efd; text-decoration: underline;">View on Google Maps</a></p>` : 
            '<p><strong>Location:</strong> Location information not available</p>'}
        </div>
        
        <div style="margin: 20px 0;">
          <h3 style="border-bottom: 1px solid #dee2e6; padding-bottom: 8px; color: #212529;">🏥 Medical Information</h3>
          ${emergencyInfo.user.bloodType ? `<p><strong>Blood Type:</strong> ${emergencyInfo.user.bloodType}</p>` : ''}
          ${emergencyInfo.user.dateOfBirth ? `<p><strong>Date of Birth:</strong> ${new Date(emergencyInfo.user.dateOfBirth).toLocaleDateString()}</p>` : ''}
          
          ${emergencyInfo.allergies && emergencyInfo.allergies.length > 0 ? 
            `<h4 style="margin-bottom: 8px; color: #721c24;">⚠️ Allergies</h4>
             <ul style="margin-top: 0; padding-left: 20px;">
               ${emergencyInfo.allergies.map((allergy: any) => 
                 `<li><strong>${allergy.name}</strong> (${allergy.severity}) - ${allergy.type}</li>`
               ).join('')}
             </ul>` : 
            ''}
          
          ${emergencyInfo.medicalConditions && emergencyInfo.medicalConditions.length > 0 ? 
            `<h4 style="margin-bottom: 8px;">Medical Conditions</h4>
             <ul style="margin-top: 0; padding-left: 20px;">
               ${emergencyInfo.medicalConditions.map((condition: string) => `<li>${condition}</li>`).join('')}
             </ul>` : 
            ''}
        </div>
        
        <div style="margin: 20px 0;">
          <h3 style="border-bottom: 1px solid #dee2e6; padding-bottom: 8px; color: #212529;">📞 Contact Information</h3>
          <p><strong>Email:</strong> ${emergencyInfo.user.email}</p>
          ${emergencyInfo.user.phone ? `<p><strong>Phone:</strong> ${emergencyInfo.user.phone}</p>` : ''}
          ${emergencyInfo.user.address ? `<p><strong>Home Address:</strong> ${emergencyInfo.user.address}</p>` : ''}
          
          ${emergencyInfo.emergencyContacts && emergencyInfo.emergencyContacts.length > 0 ? 
            `<h4 style="margin-bottom: 8px;">Additional Emergency Contacts</h4>
             <ul style="margin-top: 0; padding-left: 20px;">
               ${emergencyInfo.emergencyContacts.map((contact: any) => 
                 `<li><strong>${contact.name}:</strong> ${contact.phone}</li>`
               ).join('')}
             </ul>` : 
            ''}
        </div>
        
        <div style="background-color: #cce5ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #004085;"><strong>Important:</strong> This is an emergency alert. Please respond immediately or contact emergency services if needed.</p>
        </div>
        
        <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
          This alert was sent at ${new Date(emergencyInfo.timestamp).toLocaleString()} via Sahrak Health Emergency System.
        </p>
      </div>
    </div>
  `;

  try {
    // Send email via SMTP2GO API
    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: {
        "X-Smtp2go-Api-Key": `api-${sendGridApiKey}`,
        "Content-Type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        to: [email],
        sender: fromEmail,
        subject: subject,
        html_body: htmlContent
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Email API error: ${response.status} - ${errorText}`);
      throw new Error(`Failed to send SOS email: ${response.status}`);
    }

    console.log(`SOS email sent successfully to ${email}`);
  } catch (error) {
    console.error(`Error sending SOS email to ${email}:`, error);
    throw error;
  }
}

// Create emergency message for notifications
function createEmergencyMessage(emergencyInfo: any): string {
  const { user, location, allergies } = emergencyInfo;
  
  let message = `🚨 EMERGENCY ALERT 🚨\n\n`;
  message += `${user.name} has triggered an SOS alert.\n\n`;
  
  // Location information
  if (location.latitude && location.longitude) {
    message += `📍 LOCATION:\n`;
    message += `Coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}\n`;
    if (location.address) {
      message += `Address: ${location.address}\n`;
    }
    message += `Google Maps: https://maps.google.com/?q=${location.latitude},${location.longitude}\n\n`;
  } else if (location.address) {
    message += `📍 APPROXIMATE LOCATION: ${location.address}\n\n`;
  } else {
    message += `📍 LOCATION: Unable to determine location\n\n`;
  }
  
  // Medical information
  message += `🏥 MEDICAL INFO:\n`;
  if (user.bloodType) {
    message += `Blood Type: ${user.bloodType}\n`;
  }
  if (user.dateOfBirth) {
    message += `DOB: ${new Date(user.dateOfBirth).toLocaleDateString()}\n`;
  }
  
  // Critical allergies
  const criticalAllergies = allergies.filter((a: any) => 
    a.severity === 'severe' || a.severity === 'life-threatening'
  );
  if (criticalAllergies.length > 0) {
    message += `⚠️ CRITICAL ALLERGIES:\n`;
    criticalAllergies.forEach((allergy: any) => {
      message += `- ${allergy.name} (${allergy.severity})\n`;
    });
  }
  
  // Contact information
  message += `\n📞 CONTACT:\n`;
  message += `Email: ${user.email}\n`;
  if (user.phone) {
    message += `Phone: ${user.phone}\n`;
  }
  
  message += `\nTime: ${new Date(emergencyInfo.timestamp).toLocaleString()}\n`;
  message += `\nPlease respond immediately or contact emergency services if needed.`;
  
  return message;
}