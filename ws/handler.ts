import type { ServerWebSocket } from "bun";
import type { User } from "../generated/prisma";
import { pubSubClient } from "../database/init";
import { isoTimeString } from "../helpers/helper";
import { addRPush, setString, getString, expireString } from "../database/operations";
import {
  createDM,
  createGroup,
  findRoomBySlug,
  findRoomUsingUsers,
  getUserIdFromMessage
} from "./chat";
import type { chatPayload, markMessage, room } from "./chat.types";
import { addToQueue } from "../bull/producer";
import { initQueue } from "../bull/init";

const userSockets = new Map<string, ServerWebSocket>();

export const wsHandler = {
  open(ws: ServerWebSocket<User | any>) {
    console.log(`ws connection opened by ${ws.data.userName}`);
  },

  async message(ws: ServerWebSocket<User | any>, message: string) {
    try {
      const data = JSON.parse(message);

      if (data.type === "init") {
        await handleInit(ws, data);
      } else if (data.type === "message") {
        await handleMessage(ws, data);
      }else if(data.type==="read"){
        await handleRead(ws,data);
      }
    } catch (err) {
      console.error("Invalid WS message:", err);
    }
  },

  async close(ws: ServerWebSocket<User | any>) {
    const userId = ws.data.id;
    if (userId) {
      userSockets.delete(userId);
      await expireString(userId);
      console.log(`[ws] Disconnected: User ${userId}`);
    }
  }
};


async function handleInit(ws: ServerWebSocket<User | any>, data: any) {
  const { userId } = data;
  if (!userId) {
    return ws.send('Invalid uid');
  }
  userSockets.set(userId, ws);
  await setString(`socket:${userId}`, ws);
  ws.send(`You've connected successfully ${userId}`);
}

async function handleRead(ws:ServerWebSocket<User | any>,data:any) {
  let {messageId,userId,senderId}=data;

  if(!messageId || !userId) return ws.send('Enter the required fields.');
  
  const payload:markMessage={
    messageId:messageId,
    userId:userId
  }

  if(!senderId) senderId=await getUserIdFromMessage(senderId);
  if(!senderId) return ws.send('error occured while fetching message/message deleted');

  const senderSocket=await getUserSocket(senderId);

  await enqueueMessage('message-read-ws','markMessage',payload);

  senderSocket?.send(JSON.stringify(`ACK [MESSAGE SEEN BY ${userId} ]`));


}

async function handleMessage(ws: ServerWebSocket<User | any>, data: any) {
  const { roomSlug,name, toUserId, fromUserId, content } = data;

  let isRoom:boolean,uids:string[],arrayUser:string[],room;

  if(toUserId){
    let multiUids=Array.isArray(toUserId);
    uids = multiUids ? [fromUserId, ...toUserId] : [fromUserId, toUserId];
    arrayUser = Array.from(uids);
    room = await findOrCreateRoom(arrayUser, multiUids, name);
  }

  else if(roomSlug){
    room=await fetchRoomUsingSlug(roomSlug);
    if(typeof room==="string") return ws.send('Room does not exist');
  }

  const receiverIds=room?.users.filter((item)=>item.id!=fromUserId)!;

  isRoom=receiverIds.length > 1 ? true :false;

  const payload: chatPayload = createChatPayload(content, room?.id, fromUserId);

  await addRPush('pendingMessages', JSON.stringify(payload));
  await enqueueMessage('chat-queue-ws','flushMessages',payload);

  const receiverUserSocket = isRoom 
  ? await Promise.all(receiverIds.map(item => getUserSocket(item.id)))
  : await getUserSocket(receiverIds[0]!.id);  

  const senderUserSocket = await getUserSocket(fromUserId);

  if(!Array.isArray(receiverUserSocket)) receiverUserSocket?.send(JSON.stringify(payload));
  else receiverUserSocket.forEach((item)=>item?.send(JSON.stringify(payload)));

  senderUserSocket?.send("ACK [200]");
}



async function findOrCreateRoom(arrayUser: string[], isRoom: boolean, name: string) :Promise<room>{
  let room: room | null = await findRoomUsingUsers(arrayUser, isRoom);
  if (!room) {
    room = isRoom ? await createGroup(arrayUser, name) : await createDM(arrayUser);
  }
  return room!;
}

async function fetchRoomUsingSlug(roomSlug:string) :Promise<room|string>{
  const room:room | null=await findRoomBySlug(roomSlug);
  
  if(!room) return "";

  return room;
}

function createChatPayload(content: string, roomId: string | undefined, senderId: string): chatPayload {
  return {
    content,
    room: roomId,
    senderId,
    createdAt: isoTimeString()
  };
}


async function enqueueMessage(queueName:string,jobName:string,payload: chatPayload | markMessage) {
  const messageQueue = initQueue(queueName);
  await addToQueue(messageQueue,jobName, payload);
}


async function getUserSocket(userId: string): Promise<ServerWebSocket | undefined> {
  let userSocket = userSockets.get(userId);
  if (!userSocket) {
    userSocket = await getString(`socket:${userId}`);
  }
  return userSocket;
}

