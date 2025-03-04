import nodemailer from "nodemailer";
import { stringToBoolean } from "~/util/string";

function emailTransportType(): string {
	return process.env.EMAIL_TRANSPORT || 'file'
}

function createTransporter() {	
	if (emailTransportType() == 'file') {
		return nodemailer.createTransport({
			streamTransport: true,
			newline: 'unix',
		});
	} else if (emailTransportType() === 'smtp') {
		return nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			port: parseInt(process.env.SMTP_PORT || '587', 10),
			secure: stringToBoolean( process.env.SMTP_SECURE || "1" ),
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS,
			},
			tls: {
				minVersion: "TLSv1.2", // ✅ Enforce modern TLS
				rejectUnauthorized: false, // Debugging, remove this if working fine
			},
		});
	} else {
		throw new Error("Invalid EMAIL_TRANSPORT value. Use 'file' or 'smtp'.");
	}
};


export async function sendEmail(to: string, subject: string, text: string, html: string) {
	const transporter = createTransporter();

	const fromEmail = process.env.EMAIL_FROM || '"Example" <no-reply@example.com>';

	const info = await transporter.sendMail({
		from: fromEmail,
		to,
		subject,
		text,
		html,
	});

	// Log email to console or stdout if using file transport
	if (emailTransportType() == "file") {
		(info as any).message.pipe(process.stdout);
	}

	console.log("Email sent: %s", info.messageId);
}
