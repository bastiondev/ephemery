import post from 'axios';

async function createPassphrase(): Promise<string> {
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...Array.from(bytes)));
}

async function getRoom(): Promise<{
  roomId: string;
  roomToken: string;
}> {
  return (await post('/api/room')).data;
}

export default async function createRoom(): Promise<{
  passphrase: string;
  room: {
    roomId: string;
    roomToken: string;
  };
}> {
  const [passphrase, room] = await Promise.all([
    createPassphrase(),
    getRoom()
  ]);
  return { passphrase, room };
}
