import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { debounce } from 'lodash';

const port = process.env['REACT_APP_WSS_PORT'] || window.location.port;
const wssLocation = `ws://${window.location.hostname}:${port}/room-io`;

const KEEPALIVE_INTERVAL = 1000 * 5;

const send = (wss, message) => {
  wss.send(JSON.stringify(message));
}

const hostKeepAlive = (wss, roomId, roomToken) => {
  console.log("running keepalive")
  send(wss, { roomId, type: 'host-keepalive' });
}

const sendText = (wss, roomId, body) => {
  console.log(`Sending "${body}"`);
  send(wss, { type: 'send-room', roomId, body });
}

export default function Room(props) {
  
  const location = useLocation();
  const wss = useRef(null);
  const { roomId } = useParams();
  const [text, setText] = useState('');
  const [isHost, setIsHost] = useState(!!location.state?.roomToken);

  const textChange = (e) => {
    setText(e.target.value)
  }

  const debouncedSend = useCallback(
    debounce((text) => {
      console.log("broadcast: " + text)
    }, 300),
    []
  )

  // Host hooks
  useEffect(() => {
    if (isHost) {
      wss.current = new WebSocket(wssLocation);
      const roomId = location.pathname.split('/')[2];
      const passphrase = location.hash;
      const roomToken = location.state?.roomToken;
      if (roomToken) {
        const keepAlive = setInterval(() => hostKeepAlive(
          wss.current, roomId, roomToken
        ), KEEPALIVE_INTERVAL);
        return () => clearInterval(keepAlive);
      }
    }
  }, []);

  useEffect(() => {
    if (isHost) debouncedSend(text);
  }, [text])

  // Reader Hooks
  useEffect(() => {
    if (!isHost) {
      wss.on('message', message => {
        const {roomId, type, body} = JSON.parse(message)
      })
    }
  })

  return (
    <div className="Room">
      <h1>In Room <pre>{roomId}</pre></h1>
      {isHost &&
        <div className="mb-3">
          <textarea className="form-control" 
            rows="4" 
            onChange={textChange}
            value={text}
          />
        </div>
      }
      {!isHost &&
        <div className="mb-3">
          <textarea className="form-control" 
            rows="4" 
            value={text}
            readonly
          />
        </div>
      }
      <Link to="/">Back home</Link>
    </div>
  )
}
