import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export function otpTemplate(otp: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height:1.5;">
      <h2 style="color:#2d3748;">Welcome to Redrive!</h2>
      <p>Use the following code to verify your email address:</p>
      <div style="font-size:24px;font-weight:bold;margin:16px 0;">${otp}</div>
      <p>This code is valid for 10 minutes.</p>
      <p>Happy travels,<br/>Redrive Team</p>
    </div>
  `;
}

export async function sendOtpEmail(email: string, otp: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your Redrive verification code',
    html: otpTemplate(otp),
  });
}
