// Node.js用: Resend SMTPでメール送信API
import express, { Request, Response } from "express";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json());

const {
  RESEND_SMTP_HOST,
  RESEND_SMTP_PORT,
  RESEND_SMTP_USER,
  RESEND_SMTP_PASS,
  DEFAULT_FROM,
} = process.env;

if (
  !RESEND_SMTP_HOST ||
  !RESEND_SMTP_PORT ||
  !RESEND_SMTP_USER ||
  !RESEND_SMTP_PASS
) {
  throw new Error("SMTP環境変数が不足しています");
}

const transporter = nodemailer.createTransport({
  host: RESEND_SMTP_HOST,
  port: Number(RESEND_SMTP_PORT),
  secure: Number(RESEND_SMTP_PORT) === 465, // 465ならSSL
  auth: {
    user: RESEND_SMTP_USER,
    pass: RESEND_SMTP_PASS,
  },
});

app.post("/send-email", async (req: Request, res: Response) => {
  const { to, subject, html, from } = req.body || {};
  if (!to || !subject || !html) {
    return res.status(400).json({ error: "Missing required fields: to, subject, html" });
  }

  try {
    const info = await transporter.sendMail({
      from: from || DEFAULT_FROM || RESEND_SMTP_USER,
      to,
      subject,
      html,
    });
    res.json({ status: "ok", messageId: info.messageId });
  } catch (err) {
    console.error("send-email error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// サーバー起動（例: ポート3000）
app.listen(3000, () => {
  console.log("Mail API listening on port 3000");
});