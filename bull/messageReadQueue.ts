import { initQueue } from "./init";
import { processErrorQueue, processQueue } from "./worker";
import { getPrismaClient } from "../database/init";
import { expireString, getFromList } from "../database/operations";
import { CONNECTION_STRING } from "./init";

const QUEUE_NAME="message-read-ws";
const prismaClient=await getPrismaClient();


console.log('queue initialized');

await processQueue(QUEUE_NAME,async (job)=>{
   try{
    console.log(`${QUEUE_NAME} processing`);

    const {messageId,userId}=job.data;


    await prismaClient.messageRead.upsert({
        where:{
          messageId:messageId
        },
        update:{
          user:{
            connect:{
              id:userId
            }
          }
        },
        create:{
          messageId:messageId,
          user:{
            connect:{
              id:userId
            }
          }
        }
    });
   }catch(e){
    console.log(e)
   }
},CONNECTION_STRING);

await processErrorQueue(CONNECTION_STRING,async (job)=>{

  console.log("error queue processing");
})