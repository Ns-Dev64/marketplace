import { Queue } from "bullmq";
import type { Queue as eQ } from "bullmq";

export const CONNECTION_STRING={
    host:"localhost",
    port:6379
}

export default  interface redisConn{
    host:string,
    port:number,
    password?:string,
}

let errorQueue:eQ | null=null;


export const initQueue=(name:string)=>{

    const queue=new Queue(name,{connection:CONNECTION_STRING});

    return queue
}

export const initErrorQueue=(conn:redisConn)=>{

    if(!errorQueue) errorQueue=new Queue("error-queue",{connection:conn});

    return errorQueue

}
