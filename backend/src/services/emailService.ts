import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

/**
 * Envia um email via SMTP.
 * @param destinatario - Email do destinatário
 * @param assunto - Assunto do email
 * @param texto - Corpo do email (texto simples)
 * @returns Promise<boolean> - true se enviado, false se falhou
 */
export async function enviarEmail(
    destinatario: string,
    assunto: string,
    texto: string
): Promise<boolean> {
    const mailOptions = {
        from: `"Legacy" <${process.env.SMTP_USER}>`,
        to: destinatario,
        subject: assunto,
        text: texto,
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Erro ao enviar email:", error);
        return false;
    }
}