import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { debounce, filter, find } from 'lodash';

import { GuestCard } from '../components';
import { encryptText, decryptText } from '../services';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faTimes } from '@fortawesome/free-solid-svg-icons';

const proto = process.env['REACT_APP_ENVIRONMENT'] === 'development' ?
  'ws' : 'wss';
const port = process.env['REACT_APP_WSS_PORT'] || window.location.port;
const wssLocation = `${proto}://${window.location.hostname}:${port}/room-io`;

const KEEPALIVE_INTERVAL = 1000 * 10;
const MAX_TEXT_SIZE = 1000;

const send = (wss, message) => {
  wss.send(JSON.stringify(message));
}

export default function Room(props) {
  
  const location = useLocation();

  // Room details
  const roomId = location.pathname.split('/')[2];
  const passphrase = location.hash;
  const roomToken = location.state?.roomToken;
  const isHost = !!roomToken;

  // Room state
  const [ text, setText ] = useState('');
  const [ isOverTextSize, setIsOverTextSize ] = useState(false);
  const [ isClosed, setIsClosed ] = useState(false);
  const [ showLinkCopied, setShowLinkCopied ] = useState(false);
  const [ showContentsCopied, setShowContentsCopied ] = useState(false);
  const [ error, setError ] = useState(null);
  const [ isDisconnected, setIsDisconnected ] = useState(false);
  const [ guests, setGuests ] = useState([]);

  const wss = useRef(null);
  const copyLinkRef = useRef(null);
  const guestContentsRef = useRef(null);

  // Close room
  const closeRoom = () => {
    send(wss.current, {roomId, type: 'close-room'});
  }

  // Add/remove guests from the room
  const addGuest = (guest) => {
    if (!find(guests, {guestId: guest.guestId})) {
      setGuests(guests.concat([guest]));
    }
  }
  const removeGuest = (guest) => {
    setGuests(filter(guests, ({guestId}) => guestId !== guest.guestId));
  }

  // Debounce sending text so we don't send on every character change
  const sendText = async (text) => {
    send(wss.current, { 
      roomId, 
      type: 'send-room', 
      body: await encryptText(passphrase, text) 
    });
  }
  const debouncedSendText = useCallback(debounce(sendText, 300), [])

  const copyLink = (event) => {
    var range = document.createRange();
    range.selectNode(copyLinkRef.current);
    window.getSelection().addRange(range);
    document.execCommand('copy');
    setShowLinkCopied(true);
  }

  // Copy guest contents from disabled text area
  // Need to briefly enable to copy
  const copyGuestContents = (event) => {
    var range = document.createRange();
    guestContentsRef.current.select();
    document.execCommand('copy');
    setShowContentsCopied(true);
  }

  // Set up the WSS connection and keepalive
  useEffect(() => {
    wss.current = new WebSocket(wssLocation);   

    // Run initial keep-alive on open to keep room open
    const keepalive = () => {
      if (wss.current.readyState === 3) {
        console.log("WSS is closed, trying to reconnect")
        setIsDisconnected(true)
        wss.current = new WebSocket(wssLocation);
        wss.current.onopen = keepalive
      } else {
        send(wss.current, { 
          roomId,
          type: isHost ? 'host-keepalive' : 'guest-keepalive', 
          body: roomToken
        })
        setIsDisconnected(false)
      }
    }
    wss.current.onopen = keepalive
    const keepaliveInterval = setInterval(keepalive, KEEPALIVE_INTERVAL);

    // return clear function
    return () => {
      clearInterval(keepaliveInterval);
      wss.current.close();
      wss.current = null;
    }
  }, []);

  // Message handlers, need to be aware of text and guests state
  useEffect(() => {
    isHost ? hostHandler(wss.current) : guestHandler(wss.current)
  }, [text, guests, isClosed]);

  // Handle text changes
  useEffect(() => {
    if (wss.current.readyState === 1 && isHost) {
      debouncedSendText(text);
    }
  }, [text]);

  // Hide showCopied after delay
  useEffect(() => {
    "effect showLinkCopied"
    setTimeout(() => setShowLinkCopied(false), 3 * 1000);
  }, [showLinkCopied])
  useEffect(() => {
    "effect showContentsCopied"
    setTimeout(() => setShowContentsCopied(false), 3 * 1000);
  }, [showContentsCopied])


  // 
  // Host Web Socket Handler
  // 
  const hostHandler = (wss) => {

    wss.onmessage = async (message) => {
      const {type, body} = JSON.parse(message.data);

      if (type === 'error') {
        if (body === 'invalid-room-key')
          setError("Unable to create room. It has expired or your key is invalid.")
        else
          setError("Unknown error in room")

      } else if (type === 'guest-keepalive') {
        // Broadcast message again
        await sendText(text);
        addGuest(body);

      } else if (type === 'guest-disconnect') {
        removeGuest(body);

      } else if (type === 'close-room') {
        setIsClosed(true);

      }
    }

    wss.onerror = async (event) => {
      console.log("onerror", event);
    }

    wss.onclose = async (event) => {
      setTimeout(() => {
        if (wss.current && wss.current.readyState !== 1) setIsDisconnected(true)
      }, 1000);
    }
  }

  // 
  // Guest Web Socket Handler
  // 
  const guestHandler = (wss) => {

    // Respond to broadcast
    wss.onmessage = async (message) => {
      const {type, body} = JSON.parse(message.data);
      if (type === 'send-room') {
        setIsClosed(false);
        setText(await decryptText(passphrase, body));
      } else if (type === 'close-room') {
        setIsClosed(true);

      }
    }

    wss.onerror = async (event) => {
      console.log("onerror", event);
    }

    wss.onclose = async (event) => {
      setTimeout(() => {
        if (wss.current && wss.current.readyState !== 1) setIsDisconnected(true)
      }, 1000);
    }

  }

  return (
    <div className="RommContainer">
      <div className="Room bg-light text-dark border border-2 p-3">
        <Link className="btn btn-secondary btn-sm" to="/" onClick={closeRoom}>
          <FontAwesomeIcon icon={faTimes} className="me-2" />
          {isHost ? 'Close Room' : 'Leave Room'}
        </Link>
        {isHost &&
          <div className="RoomContents p-4">
            <div className="text-center">
              <div className="RoomLink overflow-auto border rounded-1 bg-body  d-inline-block" style={{maxWidth: '100%'}}>
                <span ref={copyLinkRef} 
                    onClick={copyLink}
                    className="RoomLinkCopy mx-auto fs-md-5 px-4 py-3 d-inline-block">
                  <FontAwesomeIcon icon={faCopy} className="RoomCopyIcon mx-2" />
                  <span ref={copyLinkRef}>
                    https://{window.location.hostname}/r/{roomId}{passphrase}
                  </span>
                </span>
              </div>
              <p>
                <small>Send this link to share this room</small>
                <br/>
                <span className={`RoomLinkCopied copied ${showLinkCopied ? 'visible' : 'hidden'}`}>
                  Copied!
                </span>
              </p>
            </div>
             <div>
              <div>
                <textarea className="form-control font-monospace" 
                  rows="5" 
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_TEXT_SIZE) {
                      setText(e.target.value);
                      setIsOverTextSize(false);
                    } else {
                      setIsOverTextSize(true);
                    }
                  }}
                  value={text}
                />
              </div>
              <p className="text-end">
                <small className={isOverTextSize ? 'text-danger fw-bold' : ''}>
                  {MAX_TEXT_SIZE - text.length} characters left
                </small>
              </p>
            </div>
            <div className="guests">
              <h4>Currently in the room:</h4>
              <div className="row row-cols-1 row-cols-md-2 g-4">
                {guests.map((guest) => 
                  <GuestCard guest={guest} key={guest.guestId} /> 
                )}
                {guests.length === 0 && 
                  <p>No guests</p>
                }
              </div>
            </div>
          </div>
        }
        {!isHost &&
          <div className="RoomContents p-4">
            {!isClosed &&
              <div className="my-3">
                <textarea className="form-control font-monospace bg-white" 
                  ref={guestContentsRef}
                  rows="5" 
                  value={text}
                  readOnly={true}
                />
                <div className="text-center my-3">
                  <button className="btn btn-sm btn-outline-primary"
                    onClick={copyGuestContents}
                  >
                    <FontAwesomeIcon icon={faCopy} className="mx-2" />
                    Copy room contents
                  </button>
                  <br/>
                  <div className={`ContentsCopied copied pt-1 ${showContentsCopied ? 'visible' : 'hidden'}`}>
                    Copied!
                  </div>
                </div>
              </div>
            }
            {isClosed &&
              <div className="Closed text-center">
                <span className="fs-5 border rounded-1 bg-body p-4 mt-3 mb-5 d-inline-block">The host has closed this room.</span>
              </div>
            }
            <div className="Help text-center">
              <h3>What is this?</h3>
              <p>Someone has opened this Ephemeral room to share this secret with you.  The text will only be available while they have the room open.  Make sure you grab what you need from them!</p>
              <p className="mb-0">For more info, see <a href="https://www.ephemery.app">ephemery.app</a>.</p>
            </div>
          </div>
        }
        {error && 
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        }
        {isDisconnected &&
          <div className="alert alert-warning" role="alert">
            Unable to connect to Ephemery server.  Trying to reconnect...
          </div>
        }
      </div>
      {!isHost && !isClosed &&
        <p className="text-center my-1">
          <small>Ephemeral Room ID <strong>{roomId}</strong></small>
        </p>
      }
    </div>
  )
}
