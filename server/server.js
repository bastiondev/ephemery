const express = require('express');
const redis = require("redis");
const { Server } = require('ws');
const { promisify } = require("util");
const parser = require('ua-parser-js');

const path = require('path');
const { nanoid } = require('nanoid');

const { NODE_ENV, PORT, REDIS_URL } = require('./config');

const ROOM_LENGTH = 12;
const ROOM_TTL = 600;
const ROOM_CLEANING_INTERVAL = 5 * 60 * 1000;
const CHANNEL_PREFIX = "eph:room";
const ROOM_TOKEN_PREFIX = `${CHANNEL_PREFIX}:room-token`;
const ROOM_GUESTS_PREFIX = `${CHANNEL_PREFIX}:room-guests`;

const app = express();


// Open Redis publisher and subscribers
console.log("Using REDIS_URL", REDIS_URL)
const publisher = redis.createClient({url: REDIS_URL});
const subscriber = redis.createClient({url: REDIS_URL});
// Promisify Redis methods:
const get = promisify(publisher.get).bind(publisher);
const set = promisify(publisher.set).bind(publisher);
const del = promisify(publisher.del).bind(publisher);
const expire = promisify(publisher.expire).bind(publisher);
const publish = promisify(publisher.publish).bind(publisher);
const psubscribe = promisify(subscriber.psubscribe).bind(subscriber);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')));

// Create room
app.post('/api/room', async (req, res) => {
  const roomId = nanoid(ROOM_LENGTH);
  const roomToken = nanoid(32);
  // Put room token with EXP
  await set(`${ROOM_TOKEN_PREFIX}:${roomId}`, roomToken, 'EX', ROOM_TTL);
  res.json({ roomId, roomToken });
  console.log(`Created room ${roomId}`)
});

// Serve react app on room
app.get('/r/*', (req, res) => {
  res.sendFile(path.join(__dirname + '/../client/build/index.html'));
});

const server = app.listen(PORT);
console.log(`Express istening on port ${PORT} in ${NODE_ENV}`);

// Start web socket server
const wss = new Server({ server, path: "/room-io" });

// Send formatted message to client
const send = (ws, type, body) => {
  ws.send(JSON.stringify({type, body}));
}

// Close room
const closeRoom = async (roomId) => {
  await publish(
    `${CHANNEL_PREFIX}:${roomId}`, 
    JSON.stringify({type: 'close-room'})
  );
  await del(`${ROOM_TOKEN_PREFIX}:${roomId}`);
}

wss.on('connection', (ws, req) => {
  let isHost = false;
  let isInvalid = false;
  let connectionRoomId = null;

  // Get browser details:
  const ua = parser(req.headers['user-agent']);

  // Create unique id
  const uid = nanoid(32);

  ws.on('message', async (data) => {

    // Parse message data
    const { type, roomId, body } = JSON.parse(data);
    const roomKey = `${CHANNEL_PREFIX}:${roomId}`;

    // Get token for room (null if room is closed)
    const roomToken = await get(`${ROOM_TOKEN_PREFIX}:${roomId}`);

    // Store roomId on WSS client
    ws.roomId = roomId;
    
    // Open room channel / keep alive if not already present (or recent)
    if (type === 'host-keepalive') {
      if (roomToken === body) {
        isHost = true;
        expire(`${ROOM_TOKEN_PREFIX}:${roomId}`, ROOM_TTL);
      } else {
        console.log(`Invalid host keep alive for room ${roomId}`)
        send(ws, "error", "invalid-room-key")
      }

    // Host send to room
    } else if (isHost && roomToken && type === 'send-room') {
      await publish(roomKey, JSON.stringify({type, body}))

    // Host closes room
    } else if (isHost && roomToken && type === 'close-room') {
      await publish(roomKey, JSON.stringify({type: 'close-room'}));
      await closeRoom(ws.roomId);

    // Guest enter a room an subscribe to messages
    } else if (!isHost && roomToken && type === 'guest-keepalive') {
      await publish(roomKey, JSON.stringify({type, body: {
        guestId: uid,
        browser: ua['browser']['name'],
        os: ua['os']['name'],
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      }}))

    // Room is closed if no room token
    } else if (!roomToken) {
      await publish(roomKey, JSON.stringify({type: 'close-room'}))

    }

  });

  // Close connection:
  //  Close room if host
  //  Remove subscriber entry if other
  ws.on('close', async (code, reason) => {
    if (ws.roomId) {
      const roomKey = `${CHANNEL_PREFIX}:${ws.roomId}`;
      if (isHost) {
        // Do nothing, shorten TTL?
      } else {
        await publish(roomKey, JSON.stringify({
          type: 'guest-disconnect', 
          body: { guestId: uid }
        }));
        console.log(`guest-disconnect from ${ws.roomId}`)
      }
    } else {
      console.log("Closed connection without roomId")
    }
  });

});

psubscribe(`${CHANNEL_PREFIX}:*`)
console.log(`psubscribed to [${CHANNEL_PREFIX}:*]`)
subscriber.on("pmessage", (pattern, channel, message) => {
  const { type, body } = JSON.parse(message);
  console.log("pmessage", channel, type);
  const roomId = channel.slice(CHANNEL_PREFIX.length + 1);
  wss.clients.forEach((client) => {
    if (client.roomId == roomId) {
      send(client, type, body);
    }
  });

});

setInterval(() => {
  if (wss.clients.size > 0) {
    console.log(`clients.size = ${wss.clients.size}`)
  }
}, 60 * 1000);

