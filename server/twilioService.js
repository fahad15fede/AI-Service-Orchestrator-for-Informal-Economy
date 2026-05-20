// KariGhar AI - Production Twilio SMS & WhatsApp Gateway integration
// Stack: Twilio Node SDK

const twilio = require('twilio');

// Load API Keys from secure environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID; // for automated OTP
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio sandbox / business number

// Initialize Twilio client conditionally
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Send an OTP verification code via Twilio Verify API
 * @param {string} phoneNumber E.164 formatted phone number (e.g. +923001234567)
 */
async function sendOTP(phoneNumber) {
    if (!client) {
        console.warn("⚠️ Twilio credentials missing. Simulating OTP code send instead.");
        return { success: true, simulated: true };
    }

    try {
        const verification = await client.verify.v2
            .services(verifyServiceSid)
            .verifications.create({ to: phoneNumber, channel: 'sms' });

        return { success: true, status: verification.status };
    } catch (error) {
        console.error("Twilio send OTP failure:", error);
        throw new Error(`Failed to transmit OTP: ${error.message}`);
    }
}

/**
 * Verify OTP code supplied by user
 * @param {string} phoneNumber
 * @param {string} code
 */
async function verifyOTP(phoneNumber, code) {
    if (!client) {
        console.warn("⚠️ Twilio credentials missing. Bypassing OTP verification check.");
        return { success: true, simulated: true };
    }

    try {
        const verificationCheck = await client.verify.v2
            .services(verifyServiceSid)
            .verificationChecks.create({ to: phoneNumber, code: code });

        return {
            success: verificationCheck.status === 'approved',
            status: verificationCheck.status
        };
    } catch (error) {
        console.error("Twilio OTP verification check failure:", error);
        throw new Error(`Failed to verify input OTP: ${error.message}`);
    }
}

/**
 * Dispatch booking notifications via Twilio WhatsApp API
 * @param {string} recipientNumber E.164 format (e.g. +923001234567)
 * @param {object} bookingDetails Name, rating, price, slot details
 */
async function sendWhatsAppBookingConfirmation(recipientNumber, bookingDetails) {
    if (!client) {
        console.warn(`⚠️ Twilio keys missing. Simulating WhatsApp match confirmation to: ${recipientNumber}`);
        return { success: true, simulated: true };
    }

    const { artisanName, serviceCategory, price, timeSlot, trackingLink } = bookingDetails;
    const cleanNumber = recipientNumber.startsWith('whatsapp:') ? recipientNumber : `whatsapp:${recipientNumber}`;

    try {
        const messageBody = 
            `Assalam-o-Alaikum! Your KariGhar AI match is locked. \n\n` +
            `🔧 *Service:* ${serviceCategory}\n` +
            `👨‍🔧 *Artisan:* ${artisanName}\n` +
            `📅 *Time Slot:* ${timeSlot}\n` +
            `💵 *Total Rate:* PKR ${price}\n\n` +
            `Your artisan is currently preparing transit. Track them live here: ${trackingLink || 'https://karighar.ai/track'}`;

        const message = await client.messages.create({
            from: twilioWhatsAppNumber,
            body: messageBody,
            to: cleanNumber
        });

        return { success: true, sid: message.sid };
    } catch (error) {
        console.error("Twilio WhatsApp transmission failed:", error);
        throw new Error(`Failed to route WhatsApp alert: ${error.message}`);
    }
}

module.exports = {
    sendOTP,
    verifyOTP,
    sendWhatsAppBookingConfirmation
};
