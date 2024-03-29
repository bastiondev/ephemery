import { post } from 'axios';

const createPassphrase = async () => {
  const bytes = window.crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes));
}

const getRoom = async () => {
  return (await post('/api/room')).data;
}

export default async function createRoom() {
  const [passphrase, room] = await Promise.all([
    createPassphrase(),
    getRoom()
  ]);
  return { passphrase, room };
}
