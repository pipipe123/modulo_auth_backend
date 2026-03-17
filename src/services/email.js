const { Resend } = require('resend');
const config = require('../config');

const resend = new Resend(config.resendApiKey);

const sendPasswordResetEmail = async (to, name, resetUrl) => {
  await resend.emails.send({
    from: config.fromEmail,
    to,
    subject: 'Recupera tu contraseña',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Hola ${name},</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente botón para crear una nueva contraseña. Este enlace expira en 30 minutos.</p>
        <a href="${resetUrl}"
           style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: #fff;
                  text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Restablecer contraseña
        </a>
        <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, ignora este email.</p>
      </div>
    `,
  });
};

module.exports = { sendPasswordResetEmail };
