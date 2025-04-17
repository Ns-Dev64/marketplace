import { getRedisClient } from "./init";
import Redis from "ioredis";




class lru{
    private size:number | null=null;
    public lruClient:Redis | null=null;
    private capacity:number | null=null;
    private defaultTTL:number | null=null

    constructor(capacity:number,defaultTTl:number){
        this.capacity=capacity;
        this.defaultTTL=defaultTTl;
       getRedisClient().then((client)=>this.lruClient=client).catch((err)=>console.error(err))
    }

    async getString(key:string){
        if(!key) return;
        const payload=await this.lruClient?.get(key);
    }
}
