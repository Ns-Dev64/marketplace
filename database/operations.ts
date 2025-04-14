import { getRedisClient } from "./init";

const redisClient=await getRedisClient();

export async function setString(key:string,value:any,exp:number|null=null){
    const payload=JSON.stringify(value);
    await redisClient.set(key,payload);
    if(exp) await redisClient.expire(key,exp);
}

export async function getString(key:string) {
    const payload=await redisClient.get(key);
    if(!payload) return ''
    return JSON.parse(payload!);
}

