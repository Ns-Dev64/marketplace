import { Worker } from "bullmq";
import type { Processor } from "bullmq";
import type redisConn from "./init";
import { addtoErrorQueue } from "./producer";
import { isoTimeString } from "../helpers/helper";


export const processQueue=async(queueName:string,processor:Processor,conn:redisConn)=>{
    const worker= new Worker(
        queueName,processor,{
            connection:conn,
            concurrency:10
        }
    );

    worker.on('failed',async(job,err)=>{
        if(!job) return;

        await addtoErrorQueue(conn,job.id!,err.message,{
            originalQueue:job.queueName,
            jobData:job?.data,
            failedReason:job?.failedReason,
            timestamp:isoTimeString()
        });
    });

    return  worker;
}

export const processErrorQueue=async(conn:redisConn,processor:Processor)=>{
   
    const worker=new Worker('error-queue',processor,{
        connection:conn,
        concurrency:10
    });

    worker.on('failed',async(job,err)=>{
        console.log(` ${job?.name} removed from the job queue`,err);
    })

    
}