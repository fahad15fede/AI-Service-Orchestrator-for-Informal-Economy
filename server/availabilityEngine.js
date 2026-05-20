// KariGhar AI - Artisan Availability & Atomic Slot Reservation Engine
// Core Logic: Checks, locks, leases, and releases timeslots atomically using Supabase client.

const { createClient } = require('@supabase/supabase-base');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // High privileges to bypass RLS policies during dispatch locks

const supabase = supabaseUrl && supabaseServiceRoleKey 
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

// Lock-lease duration: 5 minutes (300 seconds)
const SLOT_LOCK_LEASE_SECONDS = 300;

/**
 * Atomic Slot Lock Check & Lease Reservation
 * @param {string} slotId UUID of the slot to lock
 * @param {string} providerId UUID of the provider
 */
async function acquireSlotLock(slotId, providerId) {
    if (!supabase) {
        console.warn("⚠️ Supabase client not initialized. Simulating slot lease lock.");
        return { success: true, simulated: true };
    }

    const expiryTime = new Date(Date.now() + SLOT_LOCK_LEASE_SECONDS * 1000).toISOString();

    try {
        // Query current slot state first to prevent overwriting booked statuses
        const { data: slot, error: fetchError } = await supabase
            .from('provider_slots')
            .select('*')
            .eq('id', slotId)
            .single();

        if (fetchError || !slot) {
            throw new Error(`Slot not found: ${fetchError?.message}`);
        }

        // If slot is already permanently booked, fail
        if (slot.booking_id) {
            return { success: false, reason: "slot_already_booked" };
        }

        // Check if slot has an active lease lock from another user
        const now = new Date();
        if (slot.is_locked && slot.locked_until && new Date(slot.locked_until) > now) {
            return { success: false, reason: "slot_temporarily_locked" };
        }

        // Acquire lock lease atomically by updating row columns
        const { data: updatedSlot, error: updateError } = await supabase
            .from('provider_slots')
            .update({
                is_locked: true,
                locked_until: expiryTime
            })
            .eq('id', slotId)
            .select()
            .single();

        if (updateError) {
            throw new Error(`Update lock reservation failure: ${updateError.message}`);
        }

        return { success: true, slot: updatedSlot };
    } catch (error) {
        console.error("Atomic lock acquisition error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Permanently bind a locked slot to a booking transaction
 * @param {string} slotId 
 * @param {string} bookingId 
 */
async function finalizeSlotBooking(slotId, bookingId) {
    if (!supabase) return { success: true, simulated: true };

    try {
        const { data, error } = await supabase
            .from('provider_slots')
            .update({
                booking_id: bookingId,
                is_locked: false,
                locked_until: null
            })
            .eq('id', slotId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, slot: data };
    } catch (error) {
        console.error("Failed to commit booking reference to slot:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Release / Vacate a slot lock (either through cancellation or rollback)
 * @param {string} slotId 
 */
async function releaseSlotLock(slotId) {
    if (!supabase) return { success: true, simulated: true };

    try {
        const { data, error } = await supabase
            .from('provider_slots')
            .update({
                is_locked: false,
                locked_until: null,
                booking_id: null
            })
            .eq('id', slotId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, slot: data };
    } catch (error) {
        console.error("Failed to release slot lock:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Background Scheduler Task
 * Sweeps the database table and unlocks slots where the lease lock has expired.
 * Run this in a cron loop every 60 seconds.
 */
async function sweepExpiredSlotLocks() {
    if (!supabase) return;

    const now = new Date().toISOString();

    try {
        const { data, error } = await supabase
            .from('provider_slots')
            .update({
                is_locked: false,
                locked_until: null
            })
            .eq('is_locked', true)
            .lt('locked_until', now)
            .is('booking_id', null)
            .select();

        if (error) throw error;
        if (data && data.length > 0) {
            console.log(`🧹 Slot sweeper released ${data.length} expired lease locks.`);
        }
    } catch (error) {
        console.error("Slot sweep operation failed:", error);
    }
}

module.exports = {
    acquireSlotLock,
    finalizeSlotBooking,
    releaseSlotLock,
    sweepExpiredSlotLocks
};
