import {IGuest} from './IGuest';


export type IResponseMessage = {
  type: 'error' | 'close-room' | 'send-room'
  body: string
} | {
  type: 'guest-keepalive' | 'guest-disconnect'
  body: IGuest
}
