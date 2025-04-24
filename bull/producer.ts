import type { Queue } from "bullmq";
import { initErrorQueue } from "./init";
import type redisConn from "./init";

export const addToQueue=async (queue:Queue,jobName:string,data:any)=>{
    return await queue.add(jobName,data,{
        attempts:2
    });
}

export const addtoErrorQueue=async(conn:redisConn,jobid:string,failedReason:string,jobData:any)=>{

    const queue= initErrorQueue(conn);
    return await queue.add(`failedJob:${jobid}`,jobData,{
        attempts:1
    });
}
