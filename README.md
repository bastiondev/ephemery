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


#### Host receive guest attendance

Guest joined, will re-broadcast room content:
```json
{
  "type": "guest-join",
  "roomId": "roomId",
  "body": {
    "guestId": "Unique guest ID",
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






