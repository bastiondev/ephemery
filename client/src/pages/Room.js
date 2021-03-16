import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { debounce } from 'lodash';

const port = process.env['REACT_APP_WSS_PORT'] || window.location.port;
const wssLocation = `ws://${window.location.hostname}:${port}/room-io`;

const KEEPALIVE_INTERVAL = 1000 * 30;

const send = (wss, message) => {
  wss.send(JSON.stringify(message));
}

const hostKeepAlive = (wss, roomId, body) => {
  console.log("running keepalive")
  send(wss, { roomId, type: 'host-keepalive', body });
}

const sendText = (wss, roomId, body) => {
  console.log(`Sending "${body}"`);
  send(wss, { roomId, type: 'send-room', body });
}

const connectGuest = (wss, roomId, body) => {
  send(wss, { roomId, type: 'connect-guest', body });
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
      sendText(wss.current, roomId, text)
    }, 300),
    []
  )

  useEffect(() => {
    wss.current = new WebSocket(wssLocation);
    const roomId = location.pathname.split('/')[2];
    const passphrase = location.hash;
    if (isHost) {
      const roomToken = location.state?.roomToken;
      if (roomToken) {
        wss.current.onopen = () => {
          hostKeepAlive(wss.current, roomId, roomToken);
        }
        const keepAlive = setInterval(() => hostKeepAlive(
          wss.current, roomId, roomToken
        ), KEEPALIVE_INTERVAL);
        return () => clearInterval(keepAlive);
      }
    } else {
      console.log(wss.current)
      wss.current.onopen = () => {
        connectGuest(wss.current, roomId);
      }
      wss.current.onmessage = (message) => {
        const {roomId, type, body} = JSON.parse(message.data);
        if (type === 'broadcast') {
          setText(body);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (isHost) debouncedSend(text);
  }, [text]);

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
            readOnly={true}
          />
        </div>
      }
      <Link to="/">Back home</Link>
    </div>
  )
}
