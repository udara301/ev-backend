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

// Send booking confirmation email
export const sendBookingEmail = async (to, bookingDetails) => {
  const mailOptions = {
    from: `"EV Charger System" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Booking Confirmation",
    html: `
      <h2>Your Booking is Confirmed!</h2>
      <p>Thank you for your booking. Here are your booking details:</p>
      <ul>
        <li><strong>Vehicle:</strong> ${bookingDetails.vehicle}</li>
        <li><strong>Pickup Date:</strong> ${bookingDetails.pickup_date} ${bookingDetails.pickup_time || ''}</li>
        <li><strong>Dropoff Date:</strong> ${bookingDetails.dropoff_date} ${bookingDetails.dropoff_time || ''}</li>
        <li><strong>Total Price:</strong> ${bookingDetails.total_price}</li>
      </ul>
      <p>If you have any questions, please contact us.</p>
    `,
  };
  await transporter.sendMail(mailOptions);
};