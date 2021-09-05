import {encryptText} from '../services';

export interface IRoomMessage {
  roomId: string;
  type: 'send-room' | 'close-room' | 'host-keepalive' | 'guest-keepalive';
  body?: string;
}
