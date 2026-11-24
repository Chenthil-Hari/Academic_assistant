/**
 * Resend Email Service for Academic AI
 * Sender: Haritech <noreply@hari07.tech>
 * Domain: hari07.tech
 * Server-side only - Never expose API keys to frontend
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const PRIMARY_FROM =
  process.env.EMAIL_FROM || "Haritech <noreply@hari07.tech>";
const FALLBACK_FROM =
  process.env.EMAIL_FALLBACK_FROM || "Haritech <noreply@haritech.me>";
const APP_URL =
  process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://hari07.tech";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
  senderUsed?: string;
}

/**
 * Base email sender via Resend REST API
 * Handles automatic domain fallback if hari07.tech DNS is propagating
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, text, from = PRIMARY_FROM } = options;

  if (!RESEND_API_KEY) {
    console.error("Resend error: RESEND_API_KEY is missing in environment variables.");
    return { success: false, error: "Missing RESEND_API_KEY" };
  }

  const recipients = Array.isArray(to) ? to : [to];

  // Try primary sender first
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
        text,
      }),
    });

    const data = await res.json();

    if (res.ok && data.id) {
      return { success: true, id: data.id, senderUsed: from };
    }

    // Check if error is due to unverified domain, fallback to verified domain
    const errorMessage = data.message || JSON.stringify(data);
    if (
      errorMessage.toLowerCase().includes("not verified") &&
      from !== FALLBACK_FROM
    ) {
      console.warn(
        `Primary sender "${from}" unverified in Resend, retrying with fallback "${FALLBACK_FROM}"...`
      );
      const fallbackRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FALLBACK_FROM,
          to: recipients,
          subject,
          html,
          text,
        }),
      });

      const fallbackData = await fallbackRes.json();
      if (fallbackRes.ok && fallbackData.id) {
        return { success: true, id: fallbackData.id, senderUsed: FALLBACK_FROM };
      }
      return { success: false, error: fallbackData.message || "Failed with fallback sender" };
    }

    return { success: false, error: errorMessage };
  } catch (err: any) {
    console.error("Resend sendEmail network exception:", err);
    return { success: false, error: err.message || "Network exception" };
  }
}

/**
 * 1. Password Reset Email
 */
export async function sendForgotPasswordEmail(
  to: string,
  resetToken: string,
  userName?: string
): Promise<SendEmailResult> {
  const resetUrl = `${APP_URL}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;
  const displayName = userName || "Student";

  const subject = "Reset Your Academic AI Password";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password - Academic AI</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
    <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 32px 28px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Academic AI</h1>
      <p style="color: #c7d2fe; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Haritech Student Operating System</p>
    </div>
    
    <div style="padding: 32px 28px;">
      <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; font-weight: 700;">Password Reset Request</h2>
      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Hello <strong>${displayName}</strong>,</p>
      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">We received a request to reset the password for your Academic AI account (<strong>${to}</strong>). Click the button below to set a new password:</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #3b82f6); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">Reset My Password</a>
      </div>
      
      <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 24px;">This link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email; your account remains secure.</p>
      
      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #1e293b; word-break: break-all;">
        <p style="color: #64748b; font-size: 11px; margin-bottom: 6px;">Button not working? Copy and paste this URL into your browser:</p>
        <a href="${resetUrl}" style="color: #60a5fa; font-size: 11px; text-decoration: underline;">${resetUrl}</a>
      </div>
    </div>
    
    <div style="background: #0f172a; padding: 18px 28px; text-align: center; border-top: 1px solid #1e293b;">
      <p style="color: #64748b; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Haritech &middot; Academic AI &middot; Sent via Resend</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({ to, subject, html });
}

/**
 * 2. Notification to Admin when a new user registers
 */
export interface ApplicantDetails {
  id: string;
  name: string;
  email: string;
  college?: string;
  branch?: string;
  semester?: number;
  rollNumber?: string;
  signupReason: string;
  targetAttendance?: number;
  createdAt?: Date;
}

export async function sendNewRegistrationAdminNotification(
  adminEmail: string,
  applicant: ApplicantDetails
): Promise<SendEmailResult> {
  const adminReviewUrl = `${APP_URL}/admin/users`;
  const subject = `🔔 New Account Request: ${applicant.name} (${applicant.email})`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Account Registration Request - Academic AI</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 28px 24px; text-align: center;">
      <span style="background: rgba(0,0,0,0.25); color: #fff; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; letter-spacing: 1px;">Admin Action Required</span>
      <h1 style="color: #ffffff; margin: 8px 0 0 0; font-size: 22px; font-weight: 800;">New Account Registration Request</h1>
    </div>
    
    <div style="padding: 28px;">
      <p style="color: #94a3b8; font-size: 14px; margin-top: 0;">Hello <strong>Hari</strong>,</p>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">A new user has submitted a registration request on Academic AI and is awaiting your approval to activate their account.</p>
      
      <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #38bdf8; font-size: 13px; text-transform: uppercase; margin: 0 0 14px 0; letter-spacing: 0.5px;">Applicant Profile</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #64748b; padding: 6px 0; width: 35%;">Full Name:</td>
            <td style="color: #f1f5f9; font-weight: 600; padding: 6px 0;">${applicant.name}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 6px 0;">Email:</td>
            <td style="color: #f1f5f9; font-weight: 600; padding: 6px 0;"><a href="mailto:${applicant.email}" style="color: #60a5fa;">${applicant.email}</a></td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 6px 0;">College / Univ:</td>
            <td style="color: #f1f5f9; padding: 6px 0;">${applicant.college || "Not specified"}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 6px 0;">Branch & Sem:</td>
            <td style="color: #f1f5f9; padding: 6px 0;">${applicant.branch || "General"} &middot; Semester ${applicant.semester || 1}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 6px 0;">Roll Number:</td>
            <td style="color: #f1f5f9; padding: 6px 0;">${applicant.rollNumber || "N/A"}</td>
          </tr>
        </table>
      </div>

      <div style="background: #1e1b4b; border: 1px solid #4338ca; border-radius: 14px; padding: 18px 20px; margin: 20px 0;">
        <div style="color: #a5b4fc; font-size: 11px; text-transform: uppercase; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.5px;">💬 Why they want to create an account:</div>
        <p style="color: #f1f5f9; font-size: 14px; font-style: italic; line-height: 1.6; margin: 0;">
          &ldquo;${applicant.signupReason}&rdquo;
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${adminReviewUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #3b82f6); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">Review Request in Admin Portal &rarr;</a>
      </div>
    </div>
    
    <div style="background: #0f172a; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b;">
      <p style="color: #64748b; font-size: 11px; margin: 0;">Academic AI &middot; Admin Management Portal &middot; ${adminReviewUrl}</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({ to: adminEmail, subject, html });
}

/**
 * 3. Acknowledgment sent to applicant right after signup
 */
export async function sendRegistrationPendingAcknowledgment(
  to: string,
  name: string
): Promise<SendEmailResult> {
  const subject = "Academic AI Account Request Received";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Request Received - Academic AI</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
    <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 28px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Academic AI</h1>
      <p style="color: #c7d2fe; margin: 6px 0 0 0; font-size: 13px;">Registration Request Under Review</p>
    </div>
    
    <div style="padding: 28px;">
      <h2 style="color: #ffffff; font-size: 17px; margin-top: 0;">Thank You for Registering, ${name}!</h2>
      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">We have received your account request for Academic AI. To maintain private and quality academic management, all new registrations are reviewed by the administrator.</p>
      
      <div style="background: #0f172a; border-left: 4px solid #3b82f6; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
        <p style="color: #e2e8f0; font-size: 13px; margin: 0; line-height: 1.5;">
          <strong>Status: Pending Approval</strong><br>
          <span style="color: #94a3b8;">Our administrator (Hari) has been notified. You will receive an approval email at this address as soon as your access is granted.</span>
        </p>
      </div>

      <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">If you have any urgent questions, feel free to reply directly to this email.</p>
    </div>
    
    <div style="background: #0f172a; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b;">
      <p style="color: #64748b; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Haritech &middot; Academic AI</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({ to, subject, html });
}

/**
 * 4. Approval Notification to User
 */
export async function sendRegistrationApprovedEmail(
  to: string,
  name: string
): Promise<SendEmailResult> {
  const loginUrl = `${APP_URL}/auth/login`;
  const subject = "🎉 Your Academic AI Account Has Been Approved!";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Approved - Academic AI</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px 24px; text-align: center;">
      <span style="font-size: 40px;">🎉</span>
      <h1 style="color: #ffffff; margin: 10px 0 0 0; font-size: 24px; font-weight: 800;">Welcome to Academic AI!</h1>
      <p style="color: #d1fae5; margin: 6px 0 0 0; font-size: 13px;">Your Account Has Been Approved</p>
    </div>
    
    <div style="padding: 30px 26px;">
      <p style="color: #94a3b8; font-size: 14px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Great news! Your registration request for <strong>Academic AI</strong> has been approved by the administrator. You now have full access to your personalized student portal.</p>
      
      <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 18px; margin: 22px 0;">
        <div style="color: #10b981; font-weight: 700; font-size: 13px; margin-bottom: 8px;">What you can do right now:</div>
        <ul style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0; padding-left: 20px;">
          <li>Upload your timetable PDF for automated schedule generation</li>
          <li>Track real-time attendance percentages and safe bunk buffers</li>
          <li>Access the GATE 2027 Preparation Planner and study scheduler</li>
          <li>Connect with the AI Academic Assistant on Web and Telegram</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(16,185,129,0.4);">Log In to Your Account &rarr;</a>
      </div>

      <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">Login URL: <a href="${loginUrl}" style="color: #60a5fa;">${loginUrl}</a></p>
    </div>
    
    <div style="background: #0f172a; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b;">
      <p style="color: #64748b; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Haritech &middot; Academic AI</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({ to, subject, html });
}

/**
 * 5. Rejection Notification to User
 */
export async function sendRegistrationRejectedEmail(
  to: string,
  name: string,
  reason?: string
): Promise<SendEmailResult> {
  const subject = "Update Regarding Your Academic AI Account Request";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Request Update - Academic AI</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
    <div style="background: #1e293b; padding: 26px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">Academic AI</h1>
      <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Registration Update</p>
    </div>
    
    <div style="padding: 28px;">
      <p style="color: #94a3b8; font-size: 14px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Thank you for your interest in Academic AI. After reviewing your application, we are unable to approve your account request at this time.</p>
      
      ${
        reason
          ? `
      <div style="background: #0f172a; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; border-radius: 0 10px 10px 0;">
        <strong style="color: #f87171; font-size: 12px; text-transform: uppercase;">Note from Administrator:</strong>
        <p style="color: #cbd5e1; font-size: 13px; margin: 6px 0 0 0; line-height: 1.5;">${reason}</p>
      </div>
      `
          : ""
      }

      <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">If you believe this decision was made in error or if your academic circumstances have changed, please feel free to reach out to <a href="mailto:chenthilhari@gmail.com" style="color: #60a5fa;">chenthilhari@gmail.com</a>.</p>
    </div>
    
    <div style="background: #0f172a; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b;">
      <p style="color: #64748b; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Haritech &middot; Academic AI</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({ to, subject, html });
}
