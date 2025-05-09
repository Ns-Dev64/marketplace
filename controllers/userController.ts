import bcrypt from "bcryptjs";
import type { Context } from "hono";
import { getPrismaClient } from "../database/init";
import {setString,getString} from '../database/operations'
import {sign} from "hono/jwt"

const prismaClient=await getPrismaClient();

export const loginHandler = async (
    c:Context
  ) => {
    let user;
    const body = await c.req.json();
    const {identifier,password}=body;

    user=await getString(`user:${identifier}`);
    if(!user){
       user=await prismaClient.user.findFirst({
        where:{
          OR:[
            {email:identifier},
            {userName:identifier}
          ]
        }
      });
      await setString(`user:${identifier}`,user,120)
    }
    if(!user) return c.text('Invalid User',401);
    
    if(!await bcrypt.compare(password,user?.password!)) return c.text('Invalid password',401);

    const jwtPayload=await sign({id:user.id,userName:user.userName},Bun.env.JWT_SECRET || "");
    await setString(`session:${user.id}`,jwtPayload);
   
    return c.json({message:"User signed in successfully",data:jwtPayload},200);
    
  };

export const registerHandler=async(c:Context)=>{

  const body= await c.req.json();
  const {email,password,userName}=body;

  let user=await prismaClient.user.findFirst({
    where:{
      OR:[
        {email:email},
        {userName:userName}
      ]
    }
  })
  
  if(user) return c.text("Email/username already registered",401);

  const registeredUser=await prismaClient.user.create({
    data:{
      email:email,
      password:await bcrypt.hash(password,10),
      userName:userName
    },
  })

  await Promise.all([
    setString(`user:${registeredUser.email}`,registeredUser,120),
    setString(`user:${registeredUser.userName}`,registeredUser,120)
  ])

  return c.json({message:"user created successfully"})
  
}

export const status=async(c:Context)=>{

  let user=c.get("jwtPayload");

  if(!user) return c.text('Invalid user',400);

  return c.json({message:"User logged in.",data:user})
}

export const getUser=async(c:Context)=>{

  const uid= c.req.query('uid');

  if(!uid) return c.text("Invalid uid",401);

  let cacheValue=await getString(`user:${uid}`);
  if(cacheValue) return c.json({message:'user found',data:cacheValue});

  const dbUser=await prismaClient.user.findFirst({
    where:{
      id:uid
    }
  })
  if(!dbUser) return c.text('Error occured while processing user',400);

  await setString(`user:${uid}`,dbUser);
  
  return c.json({message:"User sent", data:dbUser});
}

