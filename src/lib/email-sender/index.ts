import nodemailer from "nodemailer";

interface SendReportEmailInput {
  to: string;
  subject: string;
  message: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendReportEmail(input: SendReportEmailInput): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"${process.env.SENDER_NAME ?? "VO360"}" <${process.env.SENDER_EMAIL ?? "hello@vo360.net"}>`,
    to: input.to,
    subject: input.subject,
    text: input.message,
    html: `<div style="font-family: Arial, sans-serif; color: #555;">
      <p>${input.message.replace(/\n/g, "<br>")}</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="font-size: 12px; color: #999;">
        Sent by VO360 — Your Intelligent Execution Partner<br>
        <a href="https://vo360.net" style="color: #F47B20;">vo360.net</a>
      </p>
    </div>`,
    attachments: [
      { filename: input.pdfFilename, content: input.pdfBuffer, contentType: "application/pdf" },
    ],
  });
}
