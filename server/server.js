const express = require('express');
const redis = require("redis");
const { Server } = require('ws');
const { promisify } = require("util");

const path = require('path');
const { nanoid } = require('nanoid');

const { NODE_ENV, PORT, REDIS_HOST } = require('./config');

const ROOM_LENGTH = 12;
const ROOM_TTL = 120;
const CHANNEL_PREFIX = "eph:room";
const ROOM_TOKEN_PREFIX = `${CHANNEL_PREFIX}:room-token`;

const app = express();


// Open Redis publisher and subscribers
const subscriber = redis.createClient({url: REDIS_HOST});
const publisher = subscriber.duplicate();
// Promisify Redis methods:
const get = promisify(subscriber.get).bind(subscriber);
const set = promisify(subscriber.set).bind(subscriber);
const del = promisify(subscriber.del).bind(subscriber);
const expire = promisify(subscriber.expire).bind(subscriber);
const pub = promisify(publisher.del).bind(publisher);


// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')));

// Create room
app.post('/room', async (req, res) => {
  const roomId = nanoid(ROOM_LENGTH);
  const roomToken = nanoid(32);
  // Put room token with EXP
  await set(`${ROOM_TOKEN_PREFIX}:${roomId}`, roomToken, 'EX', ROOM_TTL);
  res.json({ roomId, roomToken });
});

const server = app.listen(PORT);
console.log(`Express istening on port ${PORT} in ${NODE_ENV}`);


// Start web socket server
const wss = new Server({ server, path: "/room-io" });

// Room subscribers
// roomId => [ws]
let roomSubscribers = {}

// Send formatted message to client
const send = (ws, type, body) => {
  ws.send(JSON.stringify({type, body}));
}

const addRoomSubscriber = (roomId, client) => {
  if (!roomSubscribers[roomId]) {
    roomSubscribers[roomId] = [];
  }
  if (roomSubscribers.indexOf(client) < 0) {
    roomSubscribers.push(client);
  }
}

const removeRoomSubscriber = (roomId, client) => {
  const i = roomSubscribers.indexOf(client);
  if (i > -1) {
    roomSubscribers = roomSubscribers.splice(i, 1)
  }
}

wss.on('connection', (ws) => {
  let isHost = false;
  let isInvalid = false;

  ws.on('message', async (data) => {
    console.log(data)

    // Connection to room in invalid state
    if (isInvalid) {
      send(ws, "error", "invalid");
      return;
    }

    // Parse message data
    const { type, roomId, body } = JSON.parse(data);
    const roomKey = `${CHANNEL_PREFIX}:${roomId}`;
    
    // Open room channel if not already present (or recent)
    if (type === 'connect-host') {
      const roomKey = await get(`${ROOM_TOKEN_PREFIX}:${roomId}`);
      if (roomKey === body) {
        isHost = true;
        console.log('Host connected to room')
      } else {
        isInvalid = true;
        send(ws, "error", "invalid-room-key")
      }

    // Keep room open in case of connection interrupt
    } else if (isHost && type === 'host-keepalive') {
      expire(`${ROOM_TOKEN_PREFIX}:${roomId}`, ROOM_TTL);
      console.log(`Room ${roomId} host-keepalive`)

    // Enter a room an subscribe to messages
    } else if (!isHost && type === 'connect-guest') {
      addRoomSubscriber(roomId, ws);

    } else if (isHost && type === 'send-room') {
      await pub(roomKey, body)
    }

  });

  // Close connection:
  //  Close room if host
  //  Remove subscriber entry if other
  ws.on('close', async () => {
    if (isHost) {
      await del(roomKey)
    } else {
      removeRoomSubscriber(roomId, ws);
    }
    console.log('Client disconnected')
  });

});

subscriber.on("message", (channel, message) => {
  console.log("message", channel, message);
  if (channel.indexOf(CHANNEL_PREFIX) == 0) {
    // wss.clients.forEach(client => {
    //   if (client.readyState === WebSocket.OPEN) {
    //     client.send(message);
    //   }
    // });
  }
});



// setInterval(() => {
//   wss.clients.forEach((client) => {
//     client.send(new Date().toTimeString());
//   });
// }, 1000);
