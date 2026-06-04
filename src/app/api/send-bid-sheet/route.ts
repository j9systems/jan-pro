import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to, companyName, pdfBase64 } = await request.json();

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: "At least one recipient required" }, { status: 400 });
    }

    if (!pdfBase64) {
      return NextResponse.json({ error: "PDF data required" }, { status: 400 });
    }

    // Configure SMTP transport using env vars
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json(
        { error: "Email service not configured. Please set SMTP environment variables." },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Convert base64 to buffer for attachment
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const fileName = `${companyName || "Quote"} - Bid Presentation.pdf`;

    // Send email
    await transporter.sendMail({
      from: `"JAN-PRO QuoteBuilder" <${smtpFrom}>`,
      to: to.join(", "),
      subject: `Bid Presentation — ${companyName || "Commercial Cleaning Quote"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #003087;">JAN-PRO Franchise Development</h2>
          <p>Please find attached the bid presentation for <strong>${companyName || "your facility"}</strong>.</p>
          <p>This document contains the detailed breakdown of the proposed commercial cleaning services.</p>
          <br />
          <p style="color: #666; font-size: 12px;">
            This email was sent from the JAN-PRO QuoteBuilder system by ${user.email}.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send bid sheet error:", error);
    return NextResponse.json(
      { error: "Failed to send email. Please check SMTP configuration." },
      { status: 500 }
    );
  }
}
