import { getRedisClient,getPrismaClient } from "./init";

const redisClient=await getRedisClient();
const prismaClient=await getPrismaClient();
export async function setString(key:string,value:any,exp:number|null=null){
    const payload=JSON.stringify(value);
    if(!payload) return;
    await redisClient.set(key,payload);
    if(exp) await redisClient.expire(key,exp);
}

export async function getString(key:string) {
    const payload=await redisClient.get(key);
    if(!payload) return ''
    return JSON.parse(payload!);
}

export async function expireString(key:string){
    if(!key) return '';
    return await redisClient.del(key);
}

export async function variableAssets(dependentAsset:any,key:string,length:number){
    
    const cachedPosts=await getString(key);
    if(cachedPosts.length===length) return cachedPosts;
    const skip:number=cachedPosts.length;
    const posts=await prismaClient.item.findMany({
        where:{
            userId:dependentAsset.id
        }, 
        skip:skip,
        take:length
    });
    const mergedPosts=[...cachedPosts,...posts]
    console.log(posts)
    await setString(key,mergedPosts);
    return mergedPosts
}

export async function createChat(participants:string[]){
    let key=""
    participants.map(item=>key.concat(`user:${item}`))

    await redisClient.subscribe(key);

}