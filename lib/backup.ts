import nodemailer from 'nodemailer';

/**
 * Bundles the given experiences into a JSON string and emails it to the admin.
 * @param experiences Array of soft-deleted experience documents
 * @returns boolean indicating success or failure of the email dispatch
 */
export async function batchBackupAndDelete(experiences: any[]): Promise<boolean> {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_APP_PASSWORD;

    if (!user || !pass) {
        console.error('Missing EMAIL_USER or EMAIL_APP_PASSWORD; cannot dispatch backup.');
        return false;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass },
        });

        const jsonData = JSON.stringify(experiences, null, 2);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        const mailOptions = {
            from: `"Placement Chronicles Backup" <${user}>`,
            to: 'sanjey8105@gmail.com',
            subject: `[ALERT] MongoDB Cleanup - ${experiences.length} Experiences Backed Up & Deleted`,
            text: `The MongoDB free tier limit is approaching limit capacity. As part of the automated cleanup protocol, ${experiences.length} soft-deleted experiences have been permanently flushed from the database to clear space.\n\nA JSON backup of these records is attached.`,
            attachments: [
                {
                    filename: `batch_backup_${timestamp}.json`,
                    content: jsonData,
                    contentType: 'application/json',
                },
            ],
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Failed to send batch backup email:', error);
        return false;
    }
}
