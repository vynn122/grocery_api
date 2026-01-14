const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: process.env.MAILER_SERVICE,
  auth: {
    user: process.env.MAILER_EMAIL,
    pass: process.env.MAILER_PASSWORD,
  },
});

exports.sendEmails = async (to, otp) => {
  await transporter.sendMail({
    from: `Grocery Shop <${process.env.MAILER_EMAIL}>`,
    to,
    subject: "⚡ Your OTP Code – [${}]",
    html: `
    <div style="
      font-family: 'Arial Black', Arial, sans-serif;
      background: #1b1b1b;
      padding: 30px;
      color: white;
      text-align: center;
    ">
      <div style="
        background: #2c2c2c;
        border-radius: 20px;
        padding: 25px;
        max-width: 480px;
        margin: auto;
        box-shadow: 0 0 25px rgba(0,0,0,0.4);
      ">
        
        <!-- Title -->
        <h1 style="
          font-size: 32px;
          font-weight: 900;
          letter-spacing: 1px;
          margin-bottom: 5px;
          text-transform: uppercase;
        ">Lion App</h1>

        <p style="
          font-size: 16px;
          opacity: 0.9;
          margin-top: 0;
        ">Secure Verification Code</p>

        <!-- OTP Box -->
        <div style="
          background: #ffcc00;
          color: black;
          font-size: 36px;
          font-weight: 900;
          padding: 20px 0;
          border-radius: 14px;
          margin: 25px 0;
          letter-spacing: 8px;
        ">
          ${otp}
        </div>

        <!-- Message -->
        <p style="font-size: 15px; line-height: 22px;">
          Enter this One-Time Password to continue.<br>
          This code will expire in <strong>5 minutes</strong>.
        </p>

        <!-- Button -->
        <a href="#" style="
          display: inline-block;
          margin-top: 20px;
          padding: 14px 28px;
          background: #ff4d4d;
          color: black;
          font-weight: 900;
          border-radius: 10px;
          text-decoration: none;
          text-transform: uppercase;
        ">
          Verify Now
        </a>

        <!-- Footer -->
        <p style="
          margin-top: 30px;
          font-size: 12px;
          opacity: 0.5;
        ">
          If you didn’t request this code, you can safely ignore this email.
        </p>

      </div>
    </div>
    `,
  });
};

exports.sendEmail = async (to, otp) => {
  await transporter.sendMail({
    from: `Grocery Shop <${process.env.MAILER_EMAIL}>`,
    to,
    subject: `Your OTP Code [${otp}] `,
    html: `
<table width="100%" border="0" cellspacing="0" cellpadding="0" 
       style="background:#2c2c2c; padding:0; margin:0; text-align:center;">
  <tr>
    <td align="center">

      <table width="600" border="0" cellspacing="0" cellpadding="0" 
             style="background:#2c2c2c; border-radius:20px; padding:30px;
             box-shadow:0 0 20px rgba(0,0,0,0.45); text-align:center;">

        <tr>
          <td>

            <!-- LOGO -->
      

            <!-- Title -->
            <h1 style="
              color:white; font-size:32px; margin:15px 0 5px; font-weight:900;
              text-transform:uppercase; font-family:'Arial Black', Arial, sans-serif;
            ">Food Lion</h1>

            <p style="color:#ddd; font-size:15px; margin:0;">
              Secure Verification Code
            </p>

            <!-- OTP -->
            <div style="
              background:#ffcc00; color:black; font-size:34px; font-weight:900;
              padding:18px 0; border-radius:14px; margin:25px 0;
              letter-spacing:8px; font-family:'Arial Black';
            ">
              ${otp}
            </div>

            <!-- Expire text -->
            <p style="color:white; font-size:14px; margin:0 0 20px; line-height:22px;">
              This OTP expires in <strong>5 minutes</strong>.
            </p>

            <!-- Button -->
            <a href="#" style="
              display:inline-block; padding:14px 28px; background:#ff4d4d;
              color:black; font-weight:900; border-radius:12px;
              text-decoration:none; text-transform:uppercase;
              font-family:'Arial Black';
            ">
              Verify Now
            </a>

            <!-- Footer text -->
            <p style="color:#bbb; font-size:11px; margin-top:25px;">
              If you didn’t request this code, you can safely ignore this email.
            </p>

          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>
    `,
  });
};
