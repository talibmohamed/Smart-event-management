import "dotenv/config";
import { Resend } from "resend";

let resendClient;

const isEmailEnabled = () => process.env.EMAIL_ENABLED !== "false";

const getResendClient = () => {
  if (resendClient) {
    return resendClient;
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set.");
  }

  resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
};

export async function sendEmail({ to, subject, html, text, attachments }) {
  if (!isEmailEnabled()) {
    return { skipped: true };
  }

  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is not set.");
  }

  const payload = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text
  };

  if (attachments?.length) {
    payload.attachments = attachments;
  }

  if (process.env.EMAIL_REPLY_TO) {
    payload.replyTo = process.env.EMAIL_REPLY_TO;
  }

  return getResendClient().emails.send(payload);
}

export function sendEmailBestEffort(emailPayload) {
  if (!emailPayload?.to) {
    return;
  }

  sendEmail(emailPayload).catch((error) => {
    console.error(
      JSON.stringify({
        scope: "email",
        action: "send_failed",
        to: emailPayload.to,
        subject: emailPayload.subject,
        error: error.message
      })
    );
  });
}

