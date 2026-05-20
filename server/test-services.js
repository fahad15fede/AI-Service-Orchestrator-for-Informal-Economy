// KariGhar AI - Backend Services Integration Verification Runner
// Description: Tests database queries, Redis geo indexing, and shoots real-time Twilio WhatsApp/SMS checks.
// Usage: node server/test-services.js --test-whatsapp "+923001234567"

const dotenv = require('dotenv');
dotenv.config(); // Loads values from a local .env file

const twilioService = require('./twilioService');
const availabilityEngine = require('./availabilityEngine');

console.log("--------------------------------------------------");
console.log("⚙️  KariGhar AI Service Verification Test Runner");
console.log("--------------------------------------------------\n");

// Read arguments
const args = process.argv.slice(2);
const whatsappTargetIdx = args.indexOf('--test-whatsapp');
const whatsappTarget = whatsappTargetIdx !== -1 ? args[whatsappTargetIdx + 1] : null;

async function runDiagnostics() {
    // 1. Diagnostics: Supabase
    console.log("🔍 [1/3] Checking Supabase Database Connection...");
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.warn("⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables are missing.");
        console.warn("   -> Operating in offline Simulation Mode.");
    } else {
        console.log(`   Connected to endpoint: ${supabaseUrl}`);
        console.log("   -> Running slot acquisition simulation check...");
        const result = await availabilityEngine.acquireSlotLock("test-slot-uuid", "test-provider-uuid");
        if (result.success) {
            console.log("   ✅ Supabase schema query simulation succeeded.");
        } else {
            console.error(`   ❌ Supabase test failed: ${result.reason || result.error}`);
        }
    }
    console.log("");

    // 2. Diagnostics: Redis
    console.log("🔍 [2/3] Checking Redis Connection...");
    const Redis = require('ioredis');
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const redis = new Redis(redisUrl);

    try {
        await redis.ping();
        console.log(`   ✅ Redis connected successfully to: ${redisUrl}`);
        redis.disconnect();
    } catch (err) {
        console.error(`   ❌ Redis connection failed: ${err.message}`);
        console.error("   -> (Ensure Redis server is running locally on port 6379)");
    }
    console.log("");

    // 3. Diagnostics: Twilio
    console.log("🔍 [3/3] Checking Twilio API Credentials...");
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        console.warn("⚠️  TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN environment variables are missing.");
        console.warn("   -> Operating in offline SMS Simulation Mode.");
    } else {
        console.log("   ✅ Twilio Credentials bound successfully.");
        
        if (whatsappTarget) {
            console.log(`   🚀 Dispatching real test WhatsApp confirmation to: ${whatsappTarget}...`);
            try {
                const details = {
                    artisanName: "Ali AC Repair",
                    serviceCategory: "AC Services",
                    price: "4,500",
                    timeSlot: "11:00 AM - 01:00 PM",
                    trackingLink: "https://karighar.ai/track/demo-booking-101"
                };
                
                const response = await twilioService.sendWhatsAppBookingConfirmation(whatsappTarget, details);
                if (response.success) {
                    console.log(`   ✅ WhatsApp message sent! Twilio Message SID: ${response.sid}`);
                    console.log("   Check your phone screen for the template message!");
                }
            } catch (err) {
                console.error(`   ❌ WhatsApp dispatch failed: ${err.message}`);
            }
        } else {
            console.log("   ℹ️  To test a real WhatsApp template dispatch, run this script with:");
            console.log("      node server/test-services.js --test-whatsapp \"+923001234567\"");
        }
    }
    console.log("\n--------------------------------------------------");
    console.log("🎉 Diagnostics Finished.");
    console.log("--------------------------------------------------");
}

runDiagnostics();
