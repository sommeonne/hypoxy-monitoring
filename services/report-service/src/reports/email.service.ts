import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>("SMTP_HOST", "smtp.gmail.com"),
      port: parseInt(this.config.get<string>("SMTP_PORT", "587")),
      secure: false,
      auth: {
        user: this.config.get<string>("SMTP_USER", ""),
        pass: this.config.get<string>("SMTP_PASS", ""),
      },
    });
  }

  async sendSessionReport(
    to: string,
    patientName: string,
    sessionDate: Date,
    pdfBuffer: Buffer,
    sessionId: string,
    conclusion?: string,
  ): Promise<void> {
    const from =
      this.config.get<string>("SMTP_FROM") ||
      this.config.get<string>("SMTP_USER");

    const dateStr = sessionDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const subject = `Hypoxy Therapy Session Report — ${dateStr}`;
    const filename = `session-report-${sessionDate.toISOString().slice(0, 10)}.pdf`;

    await this.transporter.sendMail({
      from,
      to,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0F172A;">
          <h2 style="color: #1D9E75; margin-bottom: 4px;">Hypoxy Therapy Session Report</h2>
          <p style="color: #64748B; margin-top: 0; font-size: 14px;">${dateStr}</p>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>Please find attached the PDF report for your hypoxytherapy session conducted on <strong>${dateStr}</strong>.</p>
          ${conclusion ? `<p style="color: #64748B; font-size: 14px;">Conclusion: <strong style="color: #0F172A;">${conclusion}</strong></p>` : ''}
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
        </div>
      `,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    this.logger.log(`Session report emailed to ${to} for session ${sessionId}`);
  }
}
