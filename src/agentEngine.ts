import type { SystemState, AgentLog, AgentMessage, Booking, FollowupTask, Intent } from './types';
import { SECTOR_COORDINATES } from './mockData';
import { parseIntentLocally, parseIntentWithGemini } from './nlpParser';

const DELAY_MS = 1500; // Visual delay for demo pacing

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getTimestamp(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export async function executeOrchestration(
  userInput: string,
  state: SystemState,
  onStateUpdate: (updater: (prev: SystemState) => SystemState) => void,
  apiKey?: string
): Promise<void> {
  
  // Helper to add log and trigger state update
  const addLog = (
    role: AgentLog['role'],
    message: string,
    type: AgentLog['type'],
    metadata?: any,
    threadId?: string
  ) => {
    const newLog: AgentLog = {
      id: generateId(),
      role,
      message,
      timestamp: getTimestamp(),
      type,
      metadata,
      threadId
    };
    onStateUpdate((prev) => ({
      ...prev,
      logs: [...prev.logs, newLog]
    }));
  };

  // Helper to add agent message (communication log)
  const addMessage = (from: string, to: string, content: string) => {
    const newMessage: AgentMessage = {
      id: generateId(),
      from,
      to,
      content,
      timestamp: getTimestamp()
    };
    onStateUpdate((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));
  };

  try {
    // --- STEP 0: START WORKFLOW (COORDINATOR) ---
    onStateUpdate((prev) => ({ ...prev, isProcessing: true, activeStep: 0, logs: [], messages: [] }));
    
    addLog(
      'coordinator',
      `Initializing KariGhar Service Orchestration pipeline for request: "${userInput}"`,
      'info',
      null,
      'Thread #1: Coordinator Engine'
    );
    await new Promise((r) => setTimeout(r, DELAY_MS));

    addLog(
      'coordinator',
      'Task Plan generated:\n1. Extract Intent & Entities\n2. Query Provider Registry (Location Matching)\n3. Rank & Match Best Provider (Web Worker Thread)\n4. Execute Booking Action\n5. Setup Follow-up automation',
      'thinking',
      null,
      'Thread #1: Coordinator Engine'
    );
    addMessage('Coordinator', 'NLP Parser', `Please parse intent and extract entities (service, location, time) from client request: "${userInput}"`);
    await new Promise((r) => setTimeout(r, DELAY_MS));

    // --- STEP 1: INTENT UNDERSTANDING (NLP PARSER) ---
    onStateUpdate((prev) => ({ ...prev, activeStep: 1 }));
    addLog('nlp_parser', 'Running natural language processing on input query...', 'thinking', null, 'Thread #2: NLP Parsing Engine');
    
    let intent: Intent;
    if (apiKey && apiKey.trim() !== '') {
      addLog('nlp_parser', 'Using live Gemini 2.5 Flash model for extraction...', 'info', null, 'Thread #2: NLP Parsing Engine');
      intent = await parseIntentWithGemini(userInput, apiKey);
    } else {
      addLog('nlp_parser', 'No API key provided. Falling back to local offline NLP parser...', 'info', null, 'Thread #2: NLP Parsing Engine');
      intent = parseIntentLocally(userInput);
    }

    addLog(
      'nlp_parser',
      `Intent Extracted successfully!\n- Service Type: ${intent.serviceType}\n- Location Sector: ${intent.location}\n- Target Time: ${intent.time}\n- Detected Language: ${intent.language} (Confidence: ${(intent.confidence * 100).toFixed(0)}%)`,
      'success',
      intent,
      'Thread #2: NLP Parsing Engine'
    );
    
    onStateUpdate((prev) => ({ ...prev, currentIntent: intent }));
    addMessage(
      'NLP Parser',
      'Coordinator',
      `Intent extraction complete. Category: ${intent.serviceCategory}, Location Sector: ${intent.location}, Time: ${intent.time}`
    );
    await new Promise((r) => setTimeout(r, DELAY_MS));

    if (!intent.serviceCategory) {
      addLog('coordinator', 'Failed to identify service category. Aborting orchestration.', 'error', null, 'Thread #1: Coordinator Engine');
      onStateUpdate((prev) => ({ ...prev, isProcessing: false }));
      return;
    }

    // --- STEP 2: PROVIDER DISCOVERY (PROVIDER REGISTRY) ---
    onStateUpdate((prev) => ({ ...prev, activeStep: 2 }));
    addMessage('Coordinator', 'Provider Registry', `Find providers matching category "${intent.serviceCategory}" near sector "${intent.location}"`);
    addLog(
      'provider_discovery',
      `Searching provider database for category: "${intent.serviceCategory}"...`,
      'thinking',
      null,
      'Thread #1: Coordinator Engine'
    );
    await new Promise((r) => setTimeout(r, DELAY_MS));

    // Locate requested sector coordinates
    const sectorCoord = SECTOR_COORDINATES[intent.location] || SECTOR_COORDINATES['G-13'];
    
    // Find all providers matching the category
    const categoryMatched = state.providers.filter((p) => p.category === intent.serviceCategory);
    
    if (categoryMatched.length === 0) {
      addLog('provider_discovery', `No providers found for category "${intent.serviceCategory}" in registry.`, 'error', null, 'Thread #1: Coordinator Engine');
      onStateUpdate((prev) => ({ ...prev, isProcessing: false }));
      return;
    }

    addLog(
      'provider_discovery',
      `Found ${categoryMatched.length} providers matching category "${intent.serviceCategory}". Invoking Maps API tool to calculate distance matrices from sector ${intent.location}...`,
      'info',
      null,
      'Thread #1: Coordinator Engine'
    );
    await new Promise((r) => setTimeout(r, DELAY_MS));

    // --- STEP 3: MATCHING & RANKING (RANKER & MATCHER IN WEB WORKER THREAD) ---
    onStateUpdate((prev) => ({ ...prev, activeStep: 3 }));
    addMessage('Coordinator', 'Ranker & Matcher', 'Rank candidates based on distance, rating, experience, and price. Select best.');
    addLog('ranker_matcher', 'Spawning parallel Web Worker Thread to calculate geoscores and rank candidates...', 'thinking', null, 'Thread #3: Geospatial Web-Worker');
    await new Promise((r) => setTimeout(r, 600));

    // We instantiate a real Web Worker dynamically!
    const workerBlobCode = `
      self.onmessage = function(e) {
        const { providers, sectorCoord } = e.data;
        
        function getDistance(c1, c2) {
          if (!c1 || !c2) return 999;
          const R = 6371; // km
          const dLat = (c2.lat - c1.lat) * Math.PI / 180;
          const dLng = (c2.lng - c1.lng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return Number((R * c).toFixed(2));
        }

        const scored = providers.map(p => {
          const distance = getDistance(p.coordinates, sectorCoord);
          const isAvailable = p.availability.length > 0;
          
          const ratingScore = p.rating * 15;
          const distancePenalty = distance * 4;
          const experienceBonus = p.experienceYears * 1.0;
          const availabilityScore = isAvailable ? 10 : 0;
          const totalScore = ratingScore - distancePenalty + experienceBonus + availabilityScore;
          
          const scoreExplanation = "Rating Score: +" + ratingScore.toFixed(1) + " (Rating: " + p.rating + "/5.0), " +
                                   "Distance Penalty: -" + distancePenalty.toFixed(1) + " (" + distance + " km away), " +
                                   "Exp Bonus: +" + experienceBonus.toFixed(1) + " (" + p.experienceYears + " yrs exp), " +
                                   "Availability: +" + availabilityScore;
                                   
          return {
            provider: p,
            distance,
            isAvailable,
            score: Number(totalScore.toFixed(1)),
            scoreExplanation
          };
        });

        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);

        self.postMessage({ rankedCandidates: scored });
      };
    `;

    const blob = new Blob([workerBlobCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    // Promise wrapper for worker task
    const rankedCandidates: any[] = await new Promise((resolve) => {
      worker.onmessage = (e) => {
        resolve(e.data.rankedCandidates);
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
      };
      worker.postMessage({
        providers: categoryMatched,
        sectorCoord
      });
    });

    addLog(
      'ranker_matcher',
      `Ranking completed asynchronously in background thread:\n` + 
      rankedCandidates.map((c, i) => `${i+1}. ${c.provider.name} - Score: ${c.score} (${c.provider.rating}★, ${c.distance}km)`).join('\n'),
      'success',
      rankedCandidates,
      'Thread #3: Geospatial Web-Worker'
    );
    await new Promise((r) => setTimeout(r, DELAY_MS));

    const bestCandidate = rankedCandidates[0];
    
    addLog(
      'ranker_matcher',
      `RECOMMENDATION DECISION:\nSelected **${bestCandidate.provider.name}**\nReason: ${bestCandidate.provider.name} is ${bestCandidate.distance} km away from ${intent.location} with rating ${bestCandidate.provider.rating}★ and ${bestCandidate.provider.experienceYears} years of experience. Total evaluation score: ${bestCandidate.score}.`,
      'info',
      null,
      'Thread #3: Geospatial Web-Worker'
    );
    
    addMessage(
      'Ranker & Matcher',
      'Coordinator',
      `Recommendation: Select ${bestCandidate.provider.name} (ID: ${bestCandidate.provider.id}).`
    );
    await new Promise((r) => setTimeout(r, DELAY_MS));

    // --- STEP 4: ACTION SIMULATION (EXECUTION AGENT) ---
    onStateUpdate((prev) => ({ ...prev, activeStep: 4 }));
    addMessage('Coordinator', 'Execution Agent', `Book slot for provider "${bestCandidate.provider.name}" at "${intent.time}"`);
    addLog(
      'execution_agent',
      `Accessing Booking ledger database in sandbox thread...`,
      'thinking',
      null,
      'Thread #4: Execution Engine'
    );
    await new Promise((r) => setTimeout(r, DELAY_MS));

    // Create booking record
    const newBooking: Booking = {
      id: 'BK-' + Math.floor(1000 + Math.random() * 9000),
      providerId: bestCandidate.provider.id,
      providerName: bestCandidate.provider.name,
      providerPhone: bestCandidate.provider.phone,
      categoryName: bestCandidate.provider.categoryName,
      clientName: 'Fahad (Client)',
      clientPhone: '+92 321 9998887',
      locationSector: intent.location,
      timeSlot: intent.time,
      date: 'Tomorrow',
      price: bestCandidate.provider.priceRate,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    // Update state with new booking
    onStateUpdate((prev) => ({
      ...prev,
      bookings: [newBooking, ...prev.bookings]
    }));

    addLog(
      'execution_agent',
      `Booking Action Succeeded! Generated receipt ledger in system database. \n- Booking ID: ${newBooking.id}\n- Provider: ${newBooking.providerName}\n- Cost: PKR ${newBooking.price}\n- Status: Confirmed & Notified`,
      'success',
      newBooking,
      'Thread #4: Execution Engine'
    );
    
    addMessage(
      'Execution Agent',
      'Coordinator',
      `Booking BK-${newBooking.id} created successfully and status marked as confirmed.`
    );
    await new Promise((r) => setTimeout(r, DELAY_MS));

    // --- STEP 5: FOLLOW-UP AUTOMATION (FOLLOWUP AGENT) ---
    onStateUpdate((prev) => ({ ...prev, activeStep: 5 }));
    addMessage('Coordinator', 'Follow-up Agent', `Initialize follow-up automation lifecycle for booking ${newBooking.id}`);
    addLog(
      'followup_agent',
      `Configuring scheduled triggers. Dispatching push notification request to provider's mobile terminal...`,
      'thinking',
      null,
      'Thread #5: Follow-up Cron Worker'
    );
    await new Promise((r) => setTimeout(r, DELAY_MS));

    // Define virtual future timings (in seconds relative to current time for visual demo)
    // 15 seconds, 30 seconds, 45 seconds, 60 seconds
    const nowMs = Date.now();
    
    const virtualFollowups: FollowupTask[] = [
      {
        id: generateId(),
        bookingId: newBooking.id,
        type: 'reminder',
        triggerTime: nowMs + 15 * 1000, // 15 seconds later
        status: 'pending',
        message: `📢 *Reminder:* Apka appointment kal subah "${newBooking.timeSlot}" baje *${newBooking.providerName}* ke sath scheduled hai. Hamare representative jald hi apse rabta karein ge.`
      },
      {
        id: generateId(),
        bookingId: newBooking.id,
        type: 'status_assigned',
        triggerTime: nowMs + 30 * 1000, // 30 seconds later
        status: 'pending',
        message: `🚗 *Status Update:* *${newBooking.providerName}* apke sector ${newBooking.locationSector} ke liye nikal chuke hain. Booking ID: ${newBooking.id}.`
      },
      {
        id: generateId(),
        bookingId: newBooking.id,
        type: 'status_completed',
        triggerTime: nowMs + 45 * 1000, // 45 seconds later
        status: 'pending',
        message: `✅ *Service Completed:* *${newBooking.providerName}* ne apka AC work mukammal kar diya hai. Total payble amount: PKR ${newBooking.price}.`
      },
      {
        id: generateId(),
        bookingId: newBooking.id,
        type: 'feedback_request',
        triggerTime: nowMs + 60 * 1000, // 60 seconds later
        status: 'pending',
        message: `⭐ *Feedback Request:* Apka experience kaisa raha? Plz rate *${newBooking.providerName}* by responding with 1 to 5 stars.`
      }
    ];

    onStateUpdate((prev) => ({
      ...prev,
      followups: [...virtualFollowups, ...prev.followups]
    }));

    addLog(
      'followup_agent',
      `Follow-up schedules set. Virtual notifications queued for simulation:\n` +
      `- 15s: Appointment Reminder (WhatsApp)\n` +
      `- 30s: Provider Transit Status Update\n` +
      `- 45s: Job Completion Report\n` +
      `- 60s: Star Rating Feedback Loop`,
      'success',
      virtualFollowups,
      'Thread #5: Follow-up Cron Worker'
    );
    
    addMessage(
      'Follow-up Agent',
      'Coordinator',
      `Scheduler operational. Queued 4 automated follow-ups for booking ${newBooking.id}.`
    );
    await new Promise((r) => setTimeout(r, DELAY_MS));

    // --- WORKFLOW COMPLETE (COORDINATOR) ---
    onStateUpdate((prev) => ({ ...prev, activeStep: 6, isProcessing: false }));
    addLog(
      'coordinator',
      `Service orchestrator lifecycle completed successfully for request. System standing by.`,
      'success',
      null,
      'Thread #1: Coordinator Engine'
    );

  } catch (error: any) {
    addLog('coordinator', `Orchestration error encountered: ${error?.message || error}`, 'error', null, 'Thread #1: Coordinator Engine');
    onStateUpdate((prev) => ({ ...prev, isProcessing: false }));
  }
}
