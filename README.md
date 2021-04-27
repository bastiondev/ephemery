# Ephemery

A quick, secure, and temporary channel to share secrets.  Create an ephemeral room and send the link.  Your browser is the host and the person with the link can see what you enter only while your browser keeps the room open.

### Running in development

#### Start the server

1. Create a `.env` file, following the variables in `.env.template`
2. Install dependencies with `yarn install`
3. Start the server with `yarn dev`

#### Run the client in development mode

1. Create a `.env` file, following the variables in `client/.env.template`
2. Start the client app with `cd client && yarn start`
3. Visit `localhost:3001` in your browser


### Redis data structure

A room consists of 2 elements in Redis:

1. `eph:room:room-token` STRING A room token issued to the room opener to keep room open.  Expires in 120 seconds without a `keep-alive` message.
2. `eph:room:${roomId}` CHANNEL A pub sub channel for sending messages to the host and guests of a room.


### API design

#### Host open a room:

`POST /room` returns `{ roomId, roomToken }`

Keep-alive & opens for host (keeps roomToken in Redis, which expires after unuse) websocket:
```json
{
  "type": "host-keepalive",
  "roomId": "roomId",
  "body": "roomToken"
}
```


#### Host broadcast content

Broadcast content:
```json
{
  "type": "send-room",
  "roomId": "roomId",
  "body": "encryptedRoomContent"
}
```

#### Room closed (closed by host or expired)

```json

{
  "type": "close-room",
  "roomId": "roomId"
}

```


#### Host receive guest attendance

Guest joined and/or keep alive, will re-broadcast room content:
```json
{
  "type": "guest-keepalive",
  "roomId": "roomId",
  "body": {
    "guestId": "Unique guest ID",
    "os": "Operating System",
    "browser": "Browser Name",
    "location": "Location description",
    "ip": "IP Address"
  }
}
```

Guest disconnected:
```json
{
  "type": "guest-disconnect",
  "roomId": "roomId",
  "body": {
    "guestId": "Unique guest ID"
  }
}
```


#### Guest join room

Register to receive room messages, sends:
```json
{
  "type": "connect-guest",
  "roomId": "roomId",
  "body": ""
}
```

Receive broadcast content:
```json
{
  "type": "broadcast",
  "roomId": "roomId",
  "body": "encryptedRoomContent"
}
```






