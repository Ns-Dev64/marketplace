import bcrypt from "bcryptjs";
import type { Context } from "hono";
import { getPrismaClient } from "../database/init";
import {setString,getString} from '../database/operations'
import {sign} from "hono/jwt"

const prismaClient=await getPrismaClient();

export const loginHandler = async (
    c:Context
  ) => {
  
    const body = await c.req.json();
    const {email,userName,password}=body;

    let user=await prismaClient.user.findFirst({
      where:{
        OR:[
          {email:email},
          {userName:userName}
        ]
      }
    })
  
    if(!user) return c.text('Invalid User',401);

    if(!await bcrypt.compare(password,user?.password!)) return c.text('Invalid password',401);

    const jwtPayload=sign(user,process.env.JWT_SECRET || "");
    await setString(`session:${user.id}`,jwtPayload);
   
    return c.json({message:"User signed in successfully",data:user},200);
    
  };

export const registerHandler=async(c:Context)=>{

  const body= await c.req.json();
  const {email,password,userName}=body;

  let user=await prismaClient.user.findFirst({
    where:{
      OR:[
        {email:email}
      ]
    }
  })
  
  if(user) return c.text("Email already registered",401);

  await prismaClient.user.create({
    data:{
      email:email,
      password:await bcrypt.hash(password,10),
      userName:userName
    },
  })

  return c.json({message:"user created successfully"})
  
}

export const userInfo=async(c:Context)=>{

  let user=c.get("jwtPayload");

  if(!user) return c.text('Invalid user',400);

  let cacheValue=await getString(`user:${user.id}`);
  if(cacheValue) return c.json({message:'user found',data:user});

  const dbUser=await prismaClient.user.findFirst({
    where:{
      id:user.id
    }
  })
  if(!dbUser) return c.text('Error occured while processing user',400);

  await setString(`user:${user.id}`,dbUser);
  
  return c.json({message:"User sent", data:dbUser});

}


