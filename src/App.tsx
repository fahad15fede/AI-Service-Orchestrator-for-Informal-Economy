import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Send, Shield, Activity, X, Mic, Star
} from 'lucide-react';
import type { SystemState, Booking, AgentLog } from './types';
import { MOCK_PROVIDERS, SECTOR_COORDINATES } from './mockData';
import { executeOrchestration } from './agentEngine';
import Auth from './components/Auth';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  time: string;
  isBookingCard?: boolean;
  booking?: Booking;
  isReviewRequest?: boolean;
  hasBeenReviewed?: boolean;
}

export default function App() {
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Session / Authentication State
  const [currentUser, setCurrentUser] = useState<{ role: 'client' | 'provider'; phone: string; name: string; providerId?: string } | null>(null);
  const [activeApp, setActiveApp] = useState<'client' | 'provider'>('client');
  const [mobileTab, setMobileTab] = useState<'chat' | 'map' | 'ledger'>('chat');
  const [providerMobileTab, setProviderMobileTab] = useState<'jobs' | 'map' | 'earnings'>('jobs');
  const mapInstanceMobileRef = useRef<L.Map | null>(null);
  
  // Settings & Configuration
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);

  // Sync Theme Class to Body element
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);
  
  // Application State
  const [state, setState] = useState<SystemState>({
    providers: MOCK_PROVIDERS,
    bookings: [],
    logs: [],
    messages: [],
    followups: [],
    currentIntent: null,
    activeStep: -1,
    isProcessing: false
  });

  // Voice Input Simulation
  const [isMicRecording, setIsMicRecording] = useState(false);

  // Chat Simulator State
  const [userInput, setUserInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'agent',
      text: 'Assalam-o-Alaikum! 🇵🇰 Main apka KariGhar AI assistant hoon. Main G-13, F-11, I-8 ya Islamabad ke digar sectors me AC repairing, plumbing, electrician, beauty services, ya home tuition book kar sakta hoon.\n\nApko kis service ki zaroorat hai?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // UI States
  const [selectedBookingForReceipt, setSelectedBookingForReceipt] = useState<Booking | null>(null);
  
  // Refs for scrolling chat & logs & map container
  const chatEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Sync active app role when user logs in
  useEffect(() => {
    if (currentUser) {
      setActiveApp(currentUser.role);
    }
  }, [currentUser]);

  // Save API key
  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setShowSettings(false);
  };

  // Pre-configured test scenarios
  const testScenarios = [
    { label: 'AC G-13 (Roman Urdu)', text: 'Mujhe kal subah G-13 mein AC repair wala chahiye' },
    { label: 'Plumber I-8 (Urdu)', text: 'مجھے کل صبح آئی-8 میں ایک پلمبر کی ضرورت ہے' },
    { label: 'Electrician F-11 (English)', text: 'I need an electrician in F-11 sector right now, fan is not working' },
    { label: 'Tutor H-12 (Roman Urdu)', text: 'H-12 me math parhane k liye kal shaam tutor chahye' }
  ];

  // Auto-scroll chat & logs
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.logs]);

  // Helper to initialize and update a Leaflet map instance
  const updateMapInstance = (
    elementId: string,
    ref: React.MutableRefObject<L.Map | null>
  ) => {
    const mapDiv = document.getElementById(elementId);
    if (!mapDiv) {
      if (ref.current) {
        try {
          ref.current.remove();
        } catch (e) {}
        ref.current = null;
      }
      return;
    }

    let map = ref.current;
    
    // If element container changed, or map doesn't exist, recreate it
    if (!map) {
      try {
        map = L.map(elementId, {
          zoomControl: true,
          scrollWheelZoom: true
        }).setView([33.6844, 73.0479], 12.5);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        
        ref.current = map;
      } catch (err) {
        console.error('Failed to init map', err);
        return;
      }
    } else {
      // Clear all existing markers/layers except tile layers
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
          map?.removeLayer(layer);
        }
      });
    }

    // Set markers
    const markers: L.Marker[] = [];
    const matchedSector = state.currentIntent?.location || null;
    const userCoords = matchedSector ? SECTOR_COORDINATES[matchedSector] : null;

    if (userCoords) {
      const userIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `<div class="map-avatar-icon user-home">🏠</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const userMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(`<b>Your Requested Location</b><br/>Sector: ${matchedSector}`);
      
      markers.push(userMarker);
    }

    const activeBooking = state.bookings[0];
    const selectedProviderId = activeBooking && state.isProcessing 
      ? activeBooking.providerId 
      : (activeBooking?.providerId || null);

    state.providers
      .filter((p) => !state.currentIntent?.serviceCategory || p.category === state.currentIntent.serviceCategory)
      .forEach((p) => {
        const isSelected = selectedProviderId === p.id;
        const provIcon = L.divIcon({
          className: 'custom-map-icon',
          html: `<div class="map-avatar-icon ${isSelected ? 'selected' : ''}">${p.avatar}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([p.coordinates.lat, p.coordinates.lng], { icon: provIcon })
          .addTo(map)
          .bindPopup(`<b>${p.name}</b><br/>${p.categoryName} • ${p.rating}★<br/>Rs. ${p.priceRate}`);
        
        markers.push(marker);

        if (isSelected && userCoords) {
          const pathPoints: [number, number][] = [
            [userCoords.lat, userCoords.lng],
            [p.coordinates.lat, p.coordinates.lng]
          ];
          
          L.polyline(pathPoints, {
            color: '#10b981',
            weight: 3,
            dashArray: '5, 10',
            opacity: 0.8
          }).addTo(map);
        }
      });

    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.15));
    }
  };

  // Sync maps on state transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      updateMapInstance('leaflet-map-canvas', mapInstanceRef);
      updateMapInstance('leaflet-map-canvas-mobile', mapInstanceMobileRef);
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [state.bookings, state.providers, state.currentIntent, activeApp, mobileTab, providerMobileTab]);

  // Handle map instance unmount cleanup
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (e) {}
        mapInstanceRef.current = null;
      }
      if (mapInstanceMobileRef.current) {
        try { mapInstanceMobileRef.current.remove(); } catch (e) {}
        mapInstanceMobileRef.current = null;
      }
    };
  }, []);

  // Background timer simulating followup task execution
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const firedTasks: typeof state.followups = [];
      
      setState((prev) => {
        const updatedFollowups = prev.followups.map((f) => {
          if (f.status === 'pending' && now >= f.triggerTime) {
            firedTasks.push(f);
            return { ...f, status: 'sent' as const };
          }
          return f;
        });
        
        if (firedTasks.length > 0) {
          const updatedBookings = prev.bookings.map(b => {
            const relatedFiredTask = firedTasks.find(ft => ft.bookingId === b.id);
            if (relatedFiredTask) {
              if (relatedFiredTask.type === 'status_completed') {
                return { ...b, status: 'completed' as const };
              } else if (relatedFiredTask.type === 'status_assigned') {
                return { ...b, status: 'in_progress' as const };
              }
            }
            return b;
          });

          // Add scheduler logs
          const schedulerLogs: AgentLog[] = firedTasks.map(ft => ({
            id: 'log-' + Math.random().toString(36).substring(2, 9),
            role: 'followup_agent',
            message: `[CRON JOB TRIGGERED] Scheduled update dispatched for Booking ${ft.bookingId}. Payload: ${ft.type.toUpperCase()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: 'success'
          }));

          return {
            ...prev,
            followups: updatedFollowups,
            bookings: updatedBookings,
            logs: [...prev.logs, ...schedulerLogs]
          };
        }
        return prev;
      });
      
      // Update Chat View
      firedTasks.forEach((t) => {
        setChatMessages((prevChat) => [
          ...prevChat,
          {
            id: t.id,
            sender: 'agent',
            text: t.message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isReviewRequest: t.type === 'feedback_request'
          }
        ]);
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [state.followups]);

  // Handle Voice Input Simulation
  const handleStartVoice = () => {
    if (state.isProcessing) return;
    setIsMicRecording(true);

    // Simulate speech-to-text typing transcription
    setTimeout(() => {
      setUserInput('Mujhe kal subah F-11 mein AC technician chahiye');
      setIsMicRecording(false);
      
      // Auto-trigger a reasoning log about Voice Transcription
      const voiceLog: AgentLog = {
        id: 'voice-' + Date.now(),
        role: 'coordinator',
        message: '🎙️ Voice Input Received (Urdu Speech). Google Speech-to-Text transcribed to: "Mujhe kal subah F-11 mein AC technician chahiye"',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'info'
      };
      
      setState(prev => ({
        ...prev,
        logs: [...prev.logs, voiceLog]
      }));
    }, 3500);
  };

  // Handle Form Submission
  const handleSubmit = async (textToSend: string) => {
    if (!textToSend.trim() || state.isProcessing) return;
    
    // 1. Add User message to chat
    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, userMsg]);
    setUserInput('');

    // 2. Start Agentic pipeline
    await executeOrchestration(
      textToSend,
      state,
      setState,
      apiKey
    );
  };

  // Provider panel manual workflow triggers
  const handleProviderAction = (action: 'accept' | 'arrive' | 'complete', bookingId: string) => {
    setState((prev) => {
      const updatedBookings = prev.bookings.map((b) => {
        if (b.id === bookingId) {
          const nextStatus = action === 'accept' ? 'in_progress' : action === 'arrive' ? 'in_progress' : 'completed';
          return { ...b, status: nextStatus as any };
        }
        return b;
      });

      // Clear/dispatch the corresponding scheduled follow-up tasks manually
      const updatedFollowups = prev.followups.map((f) => {
        if (f.bookingId === bookingId) {
          if (action === 'accept' && f.type === 'status_assigned') return { ...f, status: 'sent' as const };
          if (action === 'complete' && f.type === 'status_completed') return { ...f, status: 'sent' as const };
        }
        return f;
      });

      const actionLogs: AgentLog[] = [
        {
          id: 'log-' + Math.random().toString(36).substring(2, 9),
          role: 'execution_agent',
          message: `[MANUAL ACTION OVERRIDE] Service Provider triggered: ${action.toUpperCase()} for booking ${bookingId}. Syncing workspace ledger.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: 'success'
        }
      ];

      return {
        ...prev,
        bookings: updatedBookings,
        followups: updatedFollowups,
        logs: [...prev.logs, ...actionLogs]
      };
    });

    // Append manual update notification to client chat
    const textMsg = 
      action === 'accept' ? `🚗 *Status Update (Manual):* Provider ne apka job accept kar liya hai aur sector ke liye nikal chuke hain.` :
      action === 'arrive' ? `🔧 *Status Update (Manual):* Provider apke location par pohanch chuke hain aur kaam shuru kar diya hai.` :
      `✅ *Service Completed (Manual):* Kaam mukammal ho gaya hai! Apka final total: PKR ${state.bookings.find(b => b.id === bookingId)?.price}.`;

    setChatMessages((prev) => [
      ...prev,
      {
        id: 'manual-update-' + Date.now(),
        sender: 'agent',
        text: textMsg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    // If complete, trigger feedback prompt in client chat
    if (action === 'complete') {
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: 'feedback-' + Date.now(),
            sender: 'agent',
            text: `⭐ *Feedback Request:* Apka experience kaisa raha? Plz click a star rating to review your service:`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isReviewRequest: true
          }
        ]);
      }, 1000);
    }
  };

  // Handle Interactive Feedback loops
  const handleRatingClick = (stars: number, messageId: string) => {
    // 1. Mark review request in chat bubble as completed
    setChatMessages(prev => prev.map(m => m.id === messageId ? { ...m, hasBeenReviewed: true } : m));

    // 2. Append thank you text
    setChatMessages(prev => [
      ...prev,
      {
        id: 'review-thank-' + Date.now(),
        sender: 'agent',
        text: `💖 Thank you! Apne is booking ko **${stars} Stars** rate kiya hai. Apka review Provider Registry DB me update kar diya gaya hai.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    // 3. Dynamically update provider rating in registry DB
    const activeBooking = state.bookings[0];
    if (activeBooking) {
      setState(prev => {
        const updatedProviders = prev.providers.map(p => {
          if (p.id === activeBooking.providerId) {
            // Recalculate average rating
            const totalJobs = p.completedJobs + 1;
            const newRating = Number(((p.rating * p.completedJobs + stars) / totalJobs).toFixed(2));
            return {
              ...p,
              rating: newRating,
              completedJobs: totalJobs
            };
          }
          return p;
        });

        const feedbackLogs: AgentLog = {
          id: 'log-' + Math.random().toString(36).substring(2, 9),
          role: 'followup_agent',
          message: `⭐ [FEEDBACK SYNC] Recalculating Provider scores: ${activeBooking.providerName} received review of ${stars} stars. Recalculated Registry Rating: ${updatedProviders.find(p => p.id === activeBooking.providerId)?.rating}★.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: 'success'
        };

        return {
          ...prev,
          providers: updatedProviders,
          logs: [...prev.logs, feedbackLogs]
        };
      });
    }
  };

  // Monitor booking creation to inject Booking Card in mobile simulator chat
  const prevBookingsCount = useRef(0);
  useEffect(() => {
    if (state.bookings.length > prevBookingsCount.current) {
      const latestBooking = state.bookings[0];
      setTimeout(() => {
        setChatMessages(prev => [
          ...prev,
          {
            id: 'card-' + latestBooking.id,
            sender: 'agent',
            text: `✅ *Booking Confirmed!*\nHam ne ap ke liye best technician select kar liya hai. Details are below:`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isBookingCard: true,
            booking: latestBooking
          }
        ]);
      }, 500);
    }
    prevBookingsCount.current = state.bookings.length;
  }, [state.bookings]);

  // Filter bookings assigned to current logged-in provider
  const assignedJobs = currentUser?.role === 'provider' 
    ? state.bookings.filter(b => b.providerId === currentUser.providerId)
    : [];

  return (
    <div className="app-container">
      {/* Session Auth Guard */}
      {!currentUser && (
        <Auth 
          onLoginSuccess={setCurrentUser} 
          providers={state.providers} 
        />
      )}

      {/* Header */}
      <header className="app-header glass-panel">
        <div className="app-title-group">
          <h1>KariGhar AI</h1>
          <div className="app-subtitle">Service Orchestrator for Pakistan's Informal Economy</div>
        </div>
        
        <div className="api-key-container">
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 12 }}>
              <span className="provider-status-tag" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>
                👤 {currentUser.name} ({currentUser.role.toUpperCase()})
              </span>
              <button 
                className="scenario-chip" 
                onClick={() => {
                  setCurrentUser(null);
                  setChatMessages([
                    {
                      id: 'welcome-1',
                      sender: 'agent',
                      text: 'Assalam-o-Alaikum! 🇵🇰 Main apka KariGhar AI assistant hoon. Main G-13, F-11, I-8 ya Islamabad ke digar sectors me AC repairing, plumbing, electrician, beauty services, ya home tuition book kar sakta hoon.\n\nApko kis service ki zaroorat hai?',
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  ]);
                  setState(prev => ({ ...prev, bookings: [], logs: [], messages: [], followups: [], currentIntent: null, activeStep: -1 }));
                }}
              >
                Log Out
              </button>
            </div>
          )}

          <button 
            className="tab-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {theme === 'dark' ? '☀️ Light UI' : '🌙 Dark UI'}
          </button>

          <button 
            className="tab-btn" 
            onClick={() => setShowSettings(!showSettings)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Settings size={16} />
            {apiKey ? 'API Key Saved' : 'Configure Gemini API'}
          </button>
          
          {showSettings && (
            <div className="glass-panel" style={{
              position: 'absolute', top: 80, right: 24, zIndex: 100, 
              padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
              width: 320, background: '#0f172a'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Gemini Pro/Flash API Key</span>
                <X size={16} style={{ cursor: 'pointer' }} onClick={() => setShowSettings(false)} />
              </div>
              <input 
                type="password" 
                className="api-key-input" 
                placeholder="Enter Gemini API Key..." 
                defaultValue={apiKey}
                id="gemini-key-input-field"
              />
              <button 
                className="booking-receipt-action" 
                onClick={() => {
                  const val = (document.getElementById('gemini-key-input-field') as HTMLInputElement)?.value || '';
                  handleSaveApiKey(val);
                }}
              >
                Save Configuration
              </button>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                Leaves key in local storage. Runs extraction using gemini-2.5-flash. Fallbacks to local keyword dictionary if key is empty.
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <main className="dashboard-grid">
        
        {/* PANEL 1: Mobile Phone Simulator */}
        <section className="phone-simulator-wrapper">
          <div className="phone-frame">
            <div className="phone-notch"></div>
            <div className="phone-status-bar">
              <span>03:00 AM</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <Activity size={10} className="pulse-status" style={{ color: 'var(--color-success)' }} />
                <span>LTE</span>
              </div>
            </div>

            {/* Developer Bezel Toggle */}
            <div className="phone-app-toggle">
              <span style={{ fontSize: '0.55rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                📱 Simulator Mode
              </span>
              <div className="phone-app-toggle-btns">
                <button 
                  className={`app-toggle-btn ${activeApp === 'client' ? 'active' : ''}`}
                  onClick={() => setActiveApp('client')}
                >
                  Client App
                </button>
                <button 
                  className={`app-toggle-btn ${activeApp === 'provider' ? 'active' : ''}`}
                  onClick={() => setActiveApp('provider')}
                >
                  Provider App
                </button>
              </div>
            </div>
            
            <div className="phone-screen">
              {activeApp === 'client' ? (
                <>
                  <div className="phone-header">
                    <div className="avatar-pulse">
                      <Shield size={16} style={{ color: 'white' }} />
                    </div>
                    <div className="phone-header-info">
                      <h3>KariGhar Client</h3>
                      <span>{state.isProcessing ? 'Thinking...' : 'Online'}</span>
                    </div>
                  </div>

                  {/* Tabs switch */}
                  {mobileTab === 'chat' && (
                    <>
                      {/* Chat Area */}
                      <div className="phone-chat-area">
                        {chatMessages.map((msg) => (
                          <React.Fragment key={msg.id}>
                            {!msg.isBookingCard ? (
                              <div className={`chat-bubble ${msg.sender}`}>
                                <div className="log-message">{msg.text}</div>
                                
                                {/* Tap-to-Book Quick Catalog */}
                                {msg.id === 'welcome-1' && (
                                  <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                                    <button type="button" className="prefill-chip" onClick={() => handleSubmit('Mujhe G-13 me AC Repair technician chahiye')} style={{ padding: '8px 4px', fontSize: '0.65rem', textAlign: 'center', margin: 0 }}>
                                      ❄️ AC Repair (G-13)
                                    </button>
                                    <button type="button" className="prefill-chip" onClick={() => handleSubmit('Urgent plumber needed in F-11 sector')} style={{ padding: '8px 4px', fontSize: '0.65rem', textAlign: 'center', margin: 0 }}>
                                      💧 Plumbing (F-11)
                                    </button>
                                    <button type="button" className="prefill-chip" onClick={() => handleSubmit('Electrician call for H-12 Islamabad')} style={{ padding: '8px 4px', fontSize: '0.65rem', textAlign: 'center', margin: 0 }}>
                                      ⚡ Electrician (H-12)
                                    </button>
                                    <button type="button" className="prefill-chip" onClick={() => handleSubmit('Need math home tutor in I-8 sector')} style={{ padding: '8px 4px', fontSize: '0.65rem', textAlign: 'center', margin: 0 }}>
                                      📚 Home Tutor (I-8)
                                    </button>
                                  </div>
                                )}
                                
                                {/* Interactive Star Feedback Loop */}
                                {msg.isReviewRequest && !msg.hasBeenReviewed && (
                                  <div className="star-review-row">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star 
                                        key={star} 
                                        size={20}
                                        className="review-star active"
                                        onClick={() => handleRatingClick(star, msg.id)}
                                      />
                                    ))}
                                  </div>
                                )}

                                <span className="chat-time">{msg.time}</span>
                              </div>
                            ) : (
                              <div className="phone-booking-card">
                                <div className="booking-card-header">
                                  <span className="booking-id-badge">{msg.booking?.id}</span>
                                  <span className={`booking-status-badge ${msg.booking?.status}`}>
                                    {msg.booking?.status.replace('_', ' ').toUpperCase()}
                                  </span>
                                </div>
                                <div className="booking-card-detail">
                                  <div className="booking-detail-row">
                                    <span className="booking-detail-label">Service:</span>
                                    <span className="booking-detail-val">{msg.booking?.categoryName}</span>
                                  </div>
                                  <div className="booking-detail-row">
                                    <span className="booking-detail-label">Provider:</span>
                                    <span className="booking-detail-val">{msg.booking?.providerName}</span>
                                  </div>
                                  <div className="booking-detail-row">
                                    <span className="booking-detail-label">Time:</span>
                                    <span className="booking-detail-val">{msg.booking?.timeSlot}</span>
                                  </div>
                                  <div className="booking-detail-row">
                                    <span className="booking-detail-label">Rate:</span>
                                    <span className="booking-detail-val">PKR {msg.booking?.price}</span>
                                  </div>
                                </div>
                                <div 
                                  className="booking-receipt-action" 
                                  onClick={() => msg.booking && setSelectedBookingForReceipt(msg.booking)}
                                >
                                  View Booking Receipt
                                </div>
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Quick Scenarios */}
                      <div className="phone-scenarios">
                        <span className="scenarios-title">Quick Test Scenarios</span>
                        <div className="scenarios-scroll">
                          {testScenarios.map((scen, idx) => (
                            <button
                              key={idx}
                              className="scenario-chip"
                              onClick={() => setUserInput(scen.text)}
                              disabled={state.isProcessing}
                            >
                              {scen.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Chat Input */}
                      <form 
                        className="phone-input-bar" 
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSubmit(userInput);
                        }}
                      >
                        <button 
                          type="button" 
                          className={`voice-mic-btn ${isMicRecording ? 'recording' : ''}`}
                          onClick={handleStartVoice}
                          disabled={state.isProcessing || isMicRecording}
                          title="Speak Roman Urdu Request"
                        >
                          <Mic size={16} />
                        </button>

                        {isMicRecording ? (
                          <div className="phone-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-error)' }}>Speaking...</span>
                            <div className="mic-soundwaves">
                              <div className="soundwave-bar"></div>
                              <div className="soundwave-bar"></div>
                              <div className="soundwave-bar"></div>
                              <div className="soundwave-bar"></div>
                            </div>
                          </div>
                        ) : (
                          <input
                            type="text"
                            className="phone-input"
                            placeholder="AC technician in G-13 tomorrow..."
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            disabled={state.isProcessing}
                          />
                        )}
                        
                        <button type="submit" className="phone-send-btn" disabled={state.isProcessing || !userInput.trim()}>
                          <Send size={14} />
                        </button>
                      </form>
                    </>
                  )}

                  {mobileTab === 'map' && (
                    <div className="mobile-map-tab-view" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                      <div id="leaflet-map-canvas-mobile" className="map-canvas-container" style={{ flex: 1, height: '100%' }}></div>
                      <div style={{ padding: 10, background: 'var(--bg-panel-solid)', borderTop: '1px solid var(--border-light)', fontSize: '0.65rem' }}>
                        <strong>📍 Live Dispatch Tracking</strong>
                        <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                          {state.bookings.length > 0 ? (
                            `Tracking: ${state.bookings[0].providerName} is ${state.bookings[0].status.replace('_', ' ').toUpperCase()}`
                          ) : (
                            'No active booking path mapped. Request an artisan above!'
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {mobileTab === 'ledger' && (
                    <div className="mobile-ledger-tab-view" style={{ flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>🧾 Booking Ledger</div>
                      {state.bookings.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center', margin: '40px 0' }}>
                          No bookings recorded yet.
                        </div>
                      ) : (
                        state.bookings.map(b => (
                          <div key={b.id} className="glass-card" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 'bold' }}>
                              <span>{b.categoryName}</span>
                              <span className={`booking-status-badge ${b.status}`} style={{ fontSize: '0.55rem' }}>{b.status.replace('_', ' ').toUpperCase()}</span>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                              Artisan: {b.providerName} • Rs. {b.price}
                            </div>
                            <button 
                              type="button"
                              className="booking-receipt-action" 
                              style={{ padding: '4px', fontSize: '0.6rem', width: '100%', border: 'none', background: 'var(--color-primary)', borderRadius: 4, color: 'white', cursor: 'pointer' }}
                              onClick={() => setSelectedBookingForReceipt(b)}
                            >
                              View Receipt
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Client Tab Bar */}
                  <div className="phone-bottom-nav">
                    <button 
                      type="button"
                      className={`phone-nav-item ${mobileTab === 'chat' ? 'active' : ''}`}
                      onClick={() => setMobileTab('chat')}
                    >
                      💬 Chat
                    </button>
                    <button 
                      type="button"
                      className={`phone-nav-item ${mobileTab === 'map' ? 'active' : ''}`}
                      onClick={() => setMobileTab('map')}
                    >
                      🗺️ Map
                    </button>
                    <button 
                      type="button"
                      className={`phone-nav-item ${mobileTab === 'ledger' ? 'active' : ''}`}
                      onClick={() => setMobileTab('ledger')}
                    >
                      🧾 Ledger
                    </button>
                  </div>
                </>
              ) : (
                /* PROVIDER VIEW SIMULATOR */
                <>
                  <div className="provider-dashboard-view" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="provider-dash-header">
                      <h4>KariGhar Partner</h4>
                      <span className="provider-status-tag">Active</span>
                    </div>

                    {providerMobileTab === 'jobs' && (
                      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                        <div className="provider-stats-strip">
                          <div className="stat-strip-box">
                            <div className="stat-strip-val">
                              {currentUser?.role === 'provider' 
                                ? state.providers.find(p => p.id === currentUser.providerId)?.rating || 4.5
                                : '4.5'
                              }★
                            </div>
                            <div className="stat-strip-label">Rating</div>
                          </div>
                          <div className="stat-strip-box">
                            <div className="stat-strip-val">PKR 14,200</div>
                            <div className="stat-strip-label">Wallet</div>
                          </div>
                        </div>

                        <div className="provider-jobs-title">Assigned Service Bookings</div>

                        {assignedJobs.length === 0 && state.bookings.length > 0 && (
                          <div className="provider-job-card active-job" style={{ borderStyle: 'dashed' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                              No bookings match your provider account phone number.
                              <br/>
                              <button 
                                type="button"
                                className="scenario-chip" 
                                style={{ marginTop: 8 }}
                                onClick={() => {
                                  const activeBk = state.bookings[0];
                                  if (activeBk && currentUser?.providerId) {
                                    setState(prev => ({
                                      ...prev,
                                      bookings: prev.bookings.map(b => b.id === activeBk.id ? { ...b, providerId: currentUser.providerId || '', providerName: currentUser.name } : b)
                                    }));
                                  }
                                }}
                              >
                                Assign Active Booking to Me
                              </button>
                            </span>
                          </div>
                        )}

                        {assignedJobs.length === 0 && state.bookings.length === 0 && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center', padding: '30px 0' }}>
                            No service calls assigned currently. Make a client booking request first!
                          </div>
                        )}

                        {assignedJobs.map((job) => (
                          <div key={job.id} className="provider-job-card active-job">
                            <div className="job-card-header">
                              <span className="job-id">{job.id}</span>
                              <span className={`job-status-pill ${job.status}`}>
                                {job.status.toUpperCase()}
                              </span>
                            </div>
                            
                            <div className="job-details">
                              <div className="job-row">
                                <span className="job-lbl">Client Name:</span>
                                <span className="job-val">{job.clientName}</span>
                              </div>
                              <div className="job-row">
                                <span className="job-lbl">Sector:</span>
                                <span className="job-val">{job.locationSector}</span>
                              </div>
                              <div className="job-row">
                                <span className="job-lbl">Time Slot:</span>
                                <span className="job-val">{job.timeSlot}</span>
                              </div>
                              <div className="job-row">
                                <span className="job-lbl">Your Payout:</span>
                                <span className="job-val" style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>
                                  PKR {job.price}
                                </span>
                              </div>
                            </div>

                            <div className="provider-actions">
                              {job.status === 'confirmed' && (
                                <button 
                                  className="prov-btn accept"
                                  onClick={() => handleProviderAction('accept', job.id)}
                                >
                                  Accept & Go Transit
                                </button>
                              )}
                              {job.status === 'in_progress' && (
                                <button 
                                  className="prov-btn arrive"
                                  onClick={() => handleProviderAction('arrive', job.id)}
                                >
                                  Arrived at Location
                                </button>
                              )}
                              {job.status === 'in_progress' && (
                                <button 
                                  className="prov-btn complete"
                                  onClick={() => handleProviderAction('complete', job.id)}
                                >
                                  Complete Work & Payout
                                </button>
                              )}
                              {job.status === 'completed' && (
                                <span style={{ fontSize: '0.65rem', color: 'var(--color-success)', textAlign: 'center', fontWeight: 'bold' }}>
                                  Job Completed Successfully!
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {providerMobileTab === 'map' && (
                      <div className="mobile-map-tab-view" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <div id="leaflet-map-canvas-mobile" className="map-canvas-container" style={{ flex: 1, height: '100%' }}></div>
                        <div style={{ padding: 10, background: 'var(--bg-panel-solid)', borderTop: '1px solid var(--border-light)', fontSize: '0.65rem' }}>
                          <strong>📍 Client Routing Navigation</strong>
                          <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                            {assignedJobs.length > 0 ? (
                              `Active Route to Client ${assignedJobs[0].clientName} in Sector ${assignedJobs[0].locationSector}`
                            ) : (
                              'No assigned jobs to route currently.'
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {providerMobileTab === 'earnings' && (
                      <div className="mobile-earnings-tab-view" style={{ flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>💼 Earnings & Ledger</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div className="stat-strip-box" style={{ padding: 10 }}>
                            <div className="stat-strip-val" style={{ fontSize: '1rem', color: 'var(--color-secondary)' }}>PKR 14,200</div>
                            <div className="stat-strip-label" style={{ fontSize: '0.55rem' }}>Wallet Balance</div>
                          </div>
                          <div className="stat-strip-box" style={{ padding: 10 }}>
                            <div className="stat-strip-val" style={{ fontSize: '1rem', color: 'var(--color-warning)' }}>
                              {currentUser?.role === 'provider' 
                                ? state.providers.find(p => p.id === currentUser.providerId)?.rating || 4.8
                                : '4.8'
                              }★
                            </div>
                            <div className="stat-strip-label" style={{ fontSize: '0.55rem' }}>Artisan Rating</div>
                          </div>
                        </div>
                        
                        <div className="glass-card" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Performance Summary</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Completed Jobs:</span>
                            <span>{currentUser?.role === 'provider' ? state.providers.find(p => p.id === currentUser.providerId)?.completedJobs || 142 : 142} jobs</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Acceptance Rate:</span>
                            <span style={{ color: 'var(--color-success)' }}>98%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Experience:</span>
                            <span>{currentUser?.role === 'provider' ? state.providers.find(p => p.id === currentUser.providerId)?.experienceYears || 5 : 5} Years</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Provider Tab Bar */}
                    <div className="phone-bottom-nav">
                      <button 
                        type="button"
                        className={`phone-nav-item ${providerMobileTab === 'jobs' ? 'active' : ''}`}
                        onClick={() => setProviderMobileTab('jobs')}
                      >
                        📋 Jobs
                      </button>
                      <button 
                        type="button"
                        className={`phone-nav-item ${providerMobileTab === 'map' ? 'active' : ''}`}
                        onClick={() => setProviderMobileTab('map')}
                      >
                        🗺️ Navigation
                      </button>
                      <button 
                        type="button"
                        className={`phone-nav-item ${providerMobileTab === 'earnings' ? 'active' : ''}`}
                        onClick={() => setProviderMobileTab('earnings')}
                      >
                        💼 Wallet
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* CENTER PANEL: Geospatial routing map & registry database */}
        <section className="center-dispatch-panel">
          <div className="map-visualization-view glass-panel">
            <div className="dispatch-header">
              <h3>🗺️ Live Geospatial Dispatch & Routing</h3>
              <div className="dispatch-meta">
                <span className="live-pill"></span> Islamabad Grid
              </div>
            </div>
            <div id="leaflet-map-canvas" className="map-canvas-container"></div>
          </div>

          <div className="provider-registry-section glass-panel">
            <div className="section-header">
              <h4>👥 Active Artisan Registry (Sectors)</h4>
              <span className="badge-count">{state.providers.length} registered</span>
            </div>
            <div className="providers-grid-row">
              {state.providers.map((p) => {
                const isCatMatched = state.currentIntent?.serviceCategory === p.category;
                const activeBooking = state.bookings[0];
                const isSelected = activeBooking && activeBooking.providerId === p.id;
                return (
                  <div 
                    key={p.id} 
                    className={`provider-card-compact ${isSelected ? 'selected' : ''} ${isCatMatched ? 'matched' : ''}`}
                  >
                    <div className="prov-avatar-badge">{p.avatar}</div>
                    <div className="prov-info">
                      <span className="prov-name">{p.name}</span>
                      <span className="prov-category">{p.categoryName} • {p.locationSector}</span>
                      <span className="prov-rating">★ {p.rating} • Rs.{p.priceRate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: AI Dispatch Control & System Ledger */}
        <section className="control-tower-wrapper">
          {/* Thread Monitor */}
          <div className="control-card glass-panel thread-monitor-card">
            <div className="card-header">
              <h4>🧠 Active Agent Threads (Multi-Threaded Pipeline)</h4>
            </div>
            <div className="thread-list">
              {[
                { name: 'Thread #1: Coordinator Engine', status: state.isProcessing && state.activeStep === 0 ? 'running' : state.activeStep > 0 ? 'idle' : 'inactive', role: 'Main Thread orchestrator' },
                { name: 'Thread #2: NLP Parsing Engine', status: state.isProcessing && state.activeStep === 1 ? 'running' : state.activeStep > 1 ? 'idle' : 'inactive', role: 'NLU intent mapping' },
                { name: 'Thread #3: Geospatial Web-Worker', status: state.isProcessing && state.activeStep === 3 ? 'running' : state.activeStep > 3 ? 'idle' : 'inactive', role: 'Parallel distance scoring' },
                { name: 'Thread #4: Execution Engine', status: state.isProcessing && state.activeStep === 4 ? 'running' : state.activeStep > 4 ? 'idle' : 'inactive', role: 'Db ledger write' },
                { name: 'Thread #5: Follow-up Cron Worker', status: state.followups.some(f => f.status === 'pending') ? 'running' : state.followups.length > 0 ? 'idle' : 'inactive', role: 'Notification loops' },
              ].map((th, i) => (
                <div key={i} className={`thread-item ${th.status}`}>
                  <div className="thread-status-dot"></div>
                  <div className="thread-details">
                    <span className="thread-name">{th.name}</span>
                    <span className="thread-role">{th.role}</span>
                  </div>
                  <span className={`thread-badge ${th.status}`}>{th.status.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Thought Stream (Reasoning Logs) */}
          <div className="control-card glass-panel logs-stream-card">
            <div className="card-header">
              <h4>📝 AI Thought Stream & Logs</h4>
            </div>
            <div className="log-monitor">
              {state.logs.length === 0 ? (
                <div className="empty-logs-msg" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Waiting for service request intent...
                </div>
              ) : (
                state.logs.map((log) => (
                  <div key={log.id} className={`log-entry ${log.type}`}>
                    <div className="log-header">
                      <span className="log-role">{log.role.toUpperCase().replace('_', ' ')}</span>
                      {log.threadId && <span className="log-thread-tag">{log.threadId}</span>}
                      <span className="log-time">{log.timestamp}</span>
                    </div>
                    <div className="log-message">{log.message}</div>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Scheduled Automated Reminders */}
          <div className="control-card glass-panel followups-card">
            <div className="card-header">
              <h4>⏰ Automated Follow-up Trigger Queue</h4>
            </div>
            <div className="followups-list-scroll">
              {state.followups.length === 0 ? (
                <div className="empty-logs-msg" style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Scheduler queue is empty.
                </div>
              ) : (
                state.followups.map((task) => {
                  const now = Date.now();
                  const remainingSeconds = Math.max(0, Math.round((task.triggerTime - now) / 1000));
                  return (
                    <div key={task.id} className={`followup-queue-card glass-card ${task.status}`}>
                      <div className="queue-card-header">
                        <span className="queue-tag">{task.type.replace('_', ' ')}</span>
                        <span className={`queue-status ${task.status}`}>
                          {task.status === 'sent' ? 'DISPATCHED' : `PENDING (${remainingSeconds}s)`}
                        </span>
                      </div>
                      <div className="queue-card-msg">{task.message}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

      </main>

      {/* Booking Receipt PDF/Card Modal */}
      {selectedBookingForReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedBookingForReceipt(null)}>
          <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-header">
              <h2>KariGhar Services</h2>
              <p>Virtual Booking Receipt & Ledger</p>
              <button className="receipt-close-btn" onClick={() => setSelectedBookingForReceipt(null)}>
                <X size={14} />
              </button>
            </div>
            <div className="receipt-body">
              <div className="receipt-qr-section">
                <div className="receipt-qr-mock"></div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                  Booking Hash ID: {selectedBookingForReceipt.id}
                </span>
              </div>
              <div className="receipt-details-list">
                <div className="receipt-row">
                  <span className="receipt-label">Booking Reference:</span>
                  <span className="receipt-val">{selectedBookingForReceipt.id}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Service Requested:</span>
                  <span className="receipt-val">{selectedBookingForReceipt.categoryName}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Service Provider:</span>
                  <span className="receipt-val">{selectedBookingForReceipt.providerName}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Provider Contact:</span>
                  <span className="receipt-val">{selectedBookingForReceipt.providerPhone}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Client Name:</span>
                  <span className="receipt-val">{selectedBookingForReceipt.clientName}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Client Location:</span>
                  <span className="receipt-val">{selectedBookingForReceipt.locationSector}, Islamabad</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Scheduled Time:</span>
                  <span className="receipt-val">{selectedBookingForReceipt.timeSlot}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Status:</span>
                  <span className="receipt-val" style={{ color: 'var(--color-success)', textTransform: 'uppercase' }}>
                    {selectedBookingForReceipt.status}
                  </span>
                </div>
                <div className="receipt-row receipt-total-row">
                  <span>Grand Total:</span>
                  <span>PKR {selectedBookingForReceipt.price}</span>
                </div>
              </div>
              
              <div className="receipt-footer-msg">
                Thank you for using KariGhar AI Orchestrator.<br />
                This is a virtual transaction receipt simulated on the blockchain/ledger ledger system.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
