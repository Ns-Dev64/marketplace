import type { ServerWebSocket } from "bun";
import type { User } from "../generated/prisma";
import { pubSubClient } from "../database/init";
import { isoTimeString } from "../helpers/helper";
const userSockets=new Map<string,ServerWebSocket>();
const pubSub=await pubSubClient();



export const wsHandler={
    open(ws: ServerWebSocket<User | any>){
        console.log(`ws connection opened by ${ws.data.userName}`);
    },
    message(ws:ServerWebSocket<User | any>,message:string){
        try {
            const data = JSON.parse(message);
            if (data.type === "init") {
              const { userId } = data;
              userSockets.set(userId, ws);
              pubSub.subscriber.subscribe(`chat:${userId}`);
              console.log(`[ws] User ${userId} connected`);
            }
    
            if (data.type === "message") {
              const { toUserId, fromUserId, chatId, content } = data;

              userSockets.get(toUserId)?.send(JSON.stringify(content));
       
              pubSub.publisher.publish(`chat:${toUserId}`, JSON.stringify({
                type: "message",
                fromUserId,
                chatId,
                content,
                timestamp: isoTimeString()
              }));
            }

          } 
          catch (err) {
            console.error("Invalid WS message:", err);
          }
    },
    close(ws:ServerWebSocket<User | any>){
      console.log(ws.data)
      const userId = ws.data.id;
      if (userId) {
        userSockets.delete(userId);
        pubSub.subscriber.unsubscribe(`chat:${userId}`);
        console.log(`[ws] User ${userId} disconnected`);
      }
    
    }
}

 