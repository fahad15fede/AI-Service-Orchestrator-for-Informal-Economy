# Implementation Plan - Advanced Standout Features

This plan introduces advanced features to make the **AI Service Orchestrator** a highly competitive, real-world prototype:

1. **Leaflet.js & OpenStreetMap Integration**: Replaces the static grid map with a real-time interactive mapping canvas displaying Islamabad sectors.
2. **Glassmorphic Auth System**: Multi-role login screen (Client / Provider) with simulated OTP text messaging.
3. **Dual App Simulator (Client-Provider Marketplace)**: Switch between the Client chat screen and the Provider Job Dashboard, enabling two-way manual state transitions (Accept ➡️ Arrive ➡️ Start ➡️ Complete).
4. **Voice Request transcription**: Mock voice-note recording with visual soundwave animations and Urdu speech text transcription.
5. **Real-time Feedback Database updates**: Allows the client to review the provider through chat inputs, directly updating the registry.

## User Review Required

> [!IMPORTANT]
> - **Leaflet & OpenStreetMap**: We will install the core `leaflet` package and `@types/leaflet`. We will write a vanilla Leaflet wrapper inside a React hook to ensure 100% compatibility with React 19 (avoiding `react-leaflet` peer dependency issues).
> - **Simulated OTP Delivery**: Authentication is simulated. Clicking "Send OTP" will trigger a temporary banner notification at the top of the dashboard containing the verification code (e.g., `5812`) to input.

## Proposed Changes

We will modify files in `c:\Users\Fahad\Desktop\agenticAI`.

### 1. Dependencies Setup

We will install `leaflet` and its type definitions.

---

### 2. UI Components

#### [NEW] [Auth.tsx](file:///c:/Users/Fahad/Desktop/agenticAI/src/components/Auth.tsx)
- Glassmorphic auth cards for Client and Provider log-ins.
- Handles slide animations, mobile validation, and OTP verification code alerts.

#### [MODIFY] [App.tsx](file:///c:/Users/Fahad/Desktop/agenticAI/src/App.tsx)
- Integrates the `Auth` login flow.
- Adds an **App Toggle Switch** (Client View vs. Provider View) at the top of the mobile device bezel.
- Integrates Leaflet inside a `useEffect` hook to paint real Islamabad sector regions, provider coordinates, and route paths.
- Incorporates a voice microphone button with toggle state animations.
- Adds two-way updates: when a provider clicks "Accept Job" on their dashboard, the state updates live in the Client's app and chat history.

#### [MODIFY] [agentEngine.ts](file:///c:/Users/Fahad/Desktop/agenticAI/src/agentEngine.ts)
- Extends steps to allow pausing for provider actions (manual acceptance/routing) if the Provider App is active.
- Refines scheduler routines to work seamlessly with manual overrides.

#### [MODIFY] [index.css](file:///c:/Users/Fahad/Desktop/agenticAI/src/index.css)
- Adds styling for the Auth page panels, Leaflet map overlays, microphone soundwaves, and two-way toggle buttons.

---

## Verification Plan

### Automated Tests
- Run `npm run build` to verify compilation.

### Manual Verification
- Launch the application:
  1. Test authentication: Sign in as Client, verify OTP popup.
  2. Switch roles: Authenticate as Provider, view incoming jobs.
  3. Submit voice request: Click mic button, confirm transcription text submit.
  4. Test real map: Zoom/pan on Islamabad sector G-13 or I-8, verify path rendering between pins.
  5. Two-way check: Submit a request, toggle to Provider App, click "Accept", toggle back to Client App, verify chat feed updates.
