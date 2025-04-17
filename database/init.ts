import Redis from "ioredis";
import { PrismaClient } from "../generated/prisma";
import {v2 as cloudinary} from "cloudinary"


let redisClient:Redis | null=null, prismaClient:PrismaClient | null=null;

 cloudinary.config({
    cloud_name:"dubmrfndl",
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})

export async function getRedisClient() {
    if(!redisClient) redisClient=new Redis();
    return redisClient;
}

export async function getPrismaClient(){
    if(!prismaClient) prismaClient= new PrismaClient();
    return prismaClient;
}

export default cloudinary