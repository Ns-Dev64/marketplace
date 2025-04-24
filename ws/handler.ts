import type { ServerWebSocket } from "bun";
import type { User } from "../generated/prisma";
import { pubSubClient } from "../database/init";
import { isoTimeString } from "../helpers/helper";
import { addRPush, setString,getString } from "../database/operations";
import {
  createDM,
  createGroup,
  findRoomUsingSlug
} from "./chat";
import type { chatPayload, room } from "./chat.types";
import { addToQueue } from "../bull/producer";
import { initQueue } from "../bull/init";

const userSockets = new Map<string, ServerWebSocket>();
const pubSub = await pubSubClient();

export const wsHandler = {
  open(ws: ServerWebSocket<User | any>) {
    console.log(`ws connection opened by ${ws.data.userName}`);
  },

  async message(ws: ServerWebSocket<User | any>, message: string) {
    try {
      const data = JSON.parse(message);

      if (data.type === "init") {
        const { userId } = data;
        userSockets.set(userId, ws);
        await setString(userId,ws);
      }

      if (data.type === "message") {
        const { name, toUserId, fromUserId, content } = data;

        const isRoom = Array.isArray(toUserId);
        const uids: string[] = isRoom ? [fromUserId, ...toUserId] : [fromUserId, toUserId];
        const arrayUser = Array.from(uids);

        let room: room | null = await findRoomUsingSlug(arrayUser, isRoom);
        if (!room) {
          room = isRoom ? await createGroup(arrayUser, name) : await createDM(arrayUser);
        }

        const payload: chatPayload = {
          content,
          room: room?.id,
          senderId: fromUserId,
          createdAt: isoTimeString()
        };

        await addRPush('pendingMessages', JSON.stringify(payload));

        const messageQueue = initQueue('chat-queue-ws');
        await addToQueue(messageQueue, 'flushMessages', payload);

        let userSocket :ServerWebSocket | undefined=userSockets.get(toUserId);
        if(!userSocket) userSocket=await getString(toUserId);

        userSocket?.send(JSON.stringify(content));
        
      }
    } catch (err) {
      console.error("Invalid WS message:", err);
    }
  },

  close(ws: ServerWebSocket<User | any>) {
    const userId = ws.data.id;
    if (userId) {
      userSockets.delete(userId);
      pubSub.subscriber.unsubscribe(`chat:${userId}`);
      console.log(`[ws] Disconnected: User ${userId}`);
    }
  }
};
