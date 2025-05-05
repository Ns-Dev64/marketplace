import { initQueue } from "./init";
import { processErrorQueue, processQueue } from "./worker";
import { getPrismaClient } from "../database/init";
import { expireString, getFromList } from "../database/operations";
import { CONNECTION_STRING } from "./init";
const QUEUE_NAME="chat-queue-ws";
const prismaClient=await getPrismaClient();


console.log('queue initialized')

await processQueue(QUEUE_NAME,async ()=>{
   try{
    console.log('queue proccessing')
    const rawMsgs=await getFromList('pendingMessages',0,-1);

    const messages=rawMsgs.map((item)=>JSON.parse(item));
    if(!messages || messages.length===0) return;

    
    await prismaClient.message.createMany({
        data: messages.map(m => ({
          content: m.content,
          senderId: m.senderId,
          roomId: m.room,
          createdAt: new Date(m.createdAt)
        }))
      })

    await expireString('pendingMessages');
   }catch(e){
    console.log(e)
   }
},CONNECTION_STRING);

await processErrorQueue(CONNECTION_STRING,async (job)=>{

  console.log("error queue processing");
})