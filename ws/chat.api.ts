import type { Context } from "hono";
import { createGroup } from "./chat";

export const createRoomController=async(c:Context)=>{

    const {userIds,name}=await c.req.json();

    const room=await createGroup(userIds,name,true);

    if(!room) return c.text("error occured while creating a group",400);

    return c.json({message:"room created/already existed",data:room});

}