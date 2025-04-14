import Redis from "ioredis";
import { PrismaClient } from "../generated/prisma";

let redisClient:Redis | null=null, prismaClient:PrismaClient | null=null ;

export async function getRedisClient() {
    if(!redisClient) redisClient=new Redis();
    return redisClient;
}

export async function getPrismaClient(){
    if(!prismaClient) prismaClient= new PrismaClient();
    return prismaClient;
}
