import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendResetEmail = async (to, link) => {
  const mailOptions = {
    from: `"EV Charger System" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Password Reset Request",
    html: `
      <p>We received a password reset request for your account.</p>
      <p><a href="${link}">Click here to reset your password</a></p>
      <p>This link will expire in 15 minutes.</p>
    `,
  };
  await transporter.sendMail(mailOptions);
};