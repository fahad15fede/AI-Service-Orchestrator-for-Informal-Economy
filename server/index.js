// KariGhar AI - Production WebSockets & Location Tracking Dispatch Server
// Stack: Node.js, Express, Socket.io, Redis

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust for client domains in production
        methods: ["GET", "POST"]
    }
});

// Configure Redis Client (using standard REDIS_URL from Env)
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

app.use(express.json());

// Rest check
app.get('/health', (req, res) => {
    res.json({ status: "healthy", service: "karighar-dispatch-gateway" });
});

// Redis Geospatial Keys
const PROVIDER_LOC_KEY = 'providers:positions';

/**
 * Socket.io Real-time Channels
 */
io.on('connection', (socket) => {
    console.log(`📡 New Socket connected: ${socket.id}`);

    // 1. Join Rooms for updates (Client / Provider specific rooms)
    socket.on('join_session', ({ userId, role }) => {
        socket.join(`user:${userId}`);
        console.log(`👤 User joined room: user:${userId} as ${role}`);
    });

    // 2. Provider Location Stream (Continuous GPS updates from Mobile App)
    socket.on('update_location', async ({ providerId, lat, lng, bookingId }) => {
        if (!providerId || !lat || !lng) return;

        console.log(`📍 Provider [${providerId}] Lat: ${lat}, Lng: ${lng}`);

        // Write coordinates dynamically into Redis Geospatial Index
        await redis.geoadd(PROVIDER_LOC_KEY, lng, lat, providerId);

        // Also track live coordinate keys with TTL (for history tracking)
        await redis.setex(`provider:${providerId}:coordinates`, 60, JSON.stringify({ lat, lng, timestamp: Date.now() }));

        // Broadcast coordinates to the active customer of this booking
        if (bookingId) {
            io.to(`booking:${bookingId}`).emit('location_update', {
                providerId,
                lat,
                lng,
                timestamp: Date.now()
            });
        }
    });

    // 3. Join specific booking tracking room
    socket.on('track_booking', ({ bookingId }) => {
        socket.join(`booking:${bookingId}`);
        console.log(`🗺️ Tracking session active for booking ID: ${bookingId}`);
    });

    // 4. Handle disconnection
    socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
});

/**
 * API: Request match routing path calculations
 * Matches client coordinates against Redis nearby providers and returns options.
 */
app.post('/api/dispatch/match', async (req, res) => {
    const { clientLat, clientLng, category } = req.body;

    if (!clientLat || !clientLng || !category) {
        return res.status(400).json({ error: "Missing dispatch context coordinates" });
    }

    try {
        // Query Redis for nearest active providers within 5KM radius
        const radiusResult = await redis.georadius(
            PROVIDER_LOC_KEY,
            clientLng,
            clientLat,
            5, // 5 Kilometers
            'km',
            'WITHDIST',
            'ASC'
        );

        // Filter and return matches
        const matches = radiusResult.map(item => ({
            providerId: item[0],
            distanceKm: parseFloat(item[1])
        }));

        res.json({
            success: true,
            center: { lat: clientLat, lng: clientLng },
            matchedProviders: matches
        });
    } catch (err) {
        console.error("Redis geo matching error: ", err);
        res.status(500).json({ error: "Failed to query location index" });
    }
});

// Start Web Server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`🚀 Dispatch Control Server running on port ${PORT}`);
});
