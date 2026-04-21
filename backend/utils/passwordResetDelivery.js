import axios from "axios";
import nodemailer from "nodemailer";

let cachedTransporter = null;

const OTP_LABEL = "Cromgen Tool";

const requireEnv = (keys, message) => {
  const missing = keys.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(message || `Missing environment variables: ${missing.join(", ")}`);
  }
};

const getEmailTransporter = () => {
  requireEnv(
    ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"],
    "Email OTP service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM."
  );

  if (!cachedTransporter) {
    const port = Number(process.env.SMTP_PORT);

    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return cachedTransporter;
};

export const maskEmail = (email = "") => {
  const [localPart = "", domain = ""] = email.split("@");

  if (!localPart || !domain) return email;

  const visibleLocal = localPart.slice(0, 2);
  return `${visibleLocal}${"*".repeat(Math.max(localPart.length - visibleLocal.length, 1))}@${domain}`;
};

export const maskMobile = (mobile = "") => {
  if (mobile.length <= 4) return mobile;
  return `${"*".repeat(Math.max(mobile.length - 4, 1))}${mobile.slice(-4)}`;
};

const sendEmailOtp = async ({ email, otp, userName }) => {
  const transporter = getEmailTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Your password reset OTP",
    text: `Hello ${userName || "User"}, your ${OTP_LABEL} password reset OTP is ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <p>Hello ${userName || "User"},</p>
        <p>Your <strong>${OTP_LABEL}</strong> password reset OTP is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${otp}</p>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });

  return {
    deliveryTarget: maskEmail(email),
  };
};

const sendMobileOtp = async ({ mobile, otp }) => {
  requireEnv(
    ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
    "Mobile OTP service is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER."
  );

  const destination = mobile.startsWith("+")
    ? mobile
    : `${process.env.TWILIO_COUNTRY_CODE || "+91"}${mobile}`;

  const body = new URLSearchParams({
    To: destination,
    From: process.env.TWILIO_FROM_NUMBER,
    Body: `${otp} is your ${OTP_LABEL} password reset OTP. It expires in 10 minutes.`,
  });

  await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    body.toString(),
    {
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return {
    deliveryTarget: maskMobile(mobile),
  };
};

export const sendPasswordResetOtp = async ({ method, email, mobile, otp, userName }) => {
  if (method === "email") {
    return sendEmailOtp({ email, otp, userName });
  }

  if (method === "mobile") {
    return sendMobileOtp({ mobile, otp });
  }

  throw new Error("Invalid password reset method");
};
