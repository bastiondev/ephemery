import React, { useState } from 'react';
import { useHistory } from "react-router-dom";

import { createRoom, encryptText, decryptText } from '../services';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons'

export default function Home() {

  const history = useHistory();

  const [roomError, setRoomError] = useState(false);  
  const [openingRoom, setOpeningRoom] = useState(false);  

  const openRoom = async () => {
    setOpeningRoom(true);
    setRoomError(false);
    try {
      const { passphrase, room } = await createRoom();
      // await new Promise(r => setTimeout(r, 1000));
      setOpeningRoom(false);
      console.log(room);
      // const secretText = "This is secret text";
      // const encryptedText = await encryptText(passphrase, secretText);
      // console.log(encryptedText);
      // const decryptedText = await decryptText(passphrase, encryptedText);
      // console.log(decryptedText);
      history.push({ 
        pathname: `/room/${room.roomId}`, 
        hash: passphrase, 
        state: {roomToken: room.roomToken}
      });
    } catch (err) {
      console.log(err);
      setRoomError(true)
      setOpeningRoom(false);
    }
  }

  return (
    <div className="Home text-center">
      <h1 className="display-3">Ephemery</h1>
      <p className="lead mt-5">
        A quick, secure, and temporary channel to share secrets.  Create an ephemeral room and send the link.  Your browser is the host and the person with the link can see what you enter only while your browser keeps the room open.
      </p>
      <div className="my-5">
        <button className="btn btn-outline-primary btn-lg"
          type="button" 
          onClick={openRoom}
          disabled={openingRoom}
        >
          <FontAwesomeIcon icon={faPlus} className="me-2" 
            spin={openingRoom}
          />
          { openingRoom ? 'Creating room...' : 'Create a room' }
        </button>
        {roomError &&
          <div className="alert alert-danger mt-3" role="alert">
            There was an error opening a new room
          </div>
        }
      </div>
      <div className="card bg-light mt-7 p-lg-3">
        <div className="card-body ">
          <h2 className="display-6">How it works</h2>
          <p className="lead font-monospace pt-3">https://ephemery.app/r/room-id#secret-key</p>
          <p className="pb-4">
            <strong className="font-monospace pe-2">room-id</strong> Secret ID of the room channel on the server
            <br/>
            <strong className="font-monospace pe-2">secret-key</strong> Key to decrypt the text in recipient's browser
          </p>
          <p>Ephemery acts as a tunnel for the encrypted secret text to get the recipient.  The key after the <strong className="font-monospace">#</strong> is never sent to the server so only the person with the link can view the data, not even the Ephemery server!</p>
          <p>Your browser hosts the room and the data.  Close the browser window and the room disappears forever!</p>
          <p>See the source on <a href="https://github.com/bastiondev/ephemery">Github</a></p>
        </div>
      </div>
    </div>
  );
}
