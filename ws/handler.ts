import type { ServerWebSocket } from "bun";
import type { User } from "../generated/prisma";
import { pubSubClient } from "../database/init";
import { isoTimeString } from "../helpers/helper";
import { addRPush, setString, getString, expireString } from "../database/operations";
import {
  createDM,
  createGroup,
  findRoomUsingSlug
} from "./chat";
import type { chatPayload, room } from "./chat.types";
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


async function handleMessage(ws: ServerWebSocket<User | any>, data: any) {
  const { name, toUserId, fromUserId, content } = data;

  if (!toUserId || !fromUserId || !content) {
    return ws.send('Please fill all the fields');
  }

  const isRoom = Array.isArray(toUserId);
  const uids: string[] = isRoom ? [fromUserId, ...toUserId] : [fromUserId, toUserId];
  const arrayUser = Array.from(uids);

  let room = await findOrCreateRoom(arrayUser, isRoom, name);

  const payload: chatPayload = createChatPayload(content, room?.id, fromUserId);

    console.log(payload);
  await addRPush('pendingMessages', JSON.stringify(payload));
  await enqueueMessage(payload);

  const receiverUserSocket = isRoom 
  ? await Promise.all(toUserId.map(item => getUserSocket(item)))
  : await getUserSocket(toUserId);  const senderUserSocket = await getUserSocket(fromUserId);

  if(!Array.isArray(receiverUserSocket)) receiverUserSocket?.send(JSON.stringify(content));
  else receiverUserSocket.forEach((item)=>item?.send(JSON.stringify(content)));

  senderUserSocket?.send("ACK [200]");
}



async function findOrCreateRoom(arrayUser: string[], isRoom: boolean, name: string) {
  let room: room | null = await findRoomUsingSlug(arrayUser, isRoom);
  if (!room) {
    room = isRoom ? await createGroup(arrayUser, name) : await createDM(arrayUser);
  }
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


async function enqueueMessage(payload: chatPayload) {
  const messageQueue = initQueue('chat-queue-ws');
  await addToQueue(messageQueue, 'flushMessages', payload);
}


async function getUserSocket(userId: string): Promise<ServerWebSocket | undefined> {
  let userSocket = userSockets.get(userId);
  if (!userSocket) {
    userSocket = await getString(`socket:${userId}`);
  }
  return userSocket;
}
