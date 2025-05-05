import type { Context } from "hono";
import { createGroup, deleteGroup, findRoomBySlug, getChatsFromRoom, updateGroup } from "./chat";
import type { cursorChat } from "./chat.types";

export const createRoomController=async(c:Context)=>{

    const {userIds,name}=await c.req.json();

    const room=await createGroup(userIds,name,true);

    if(!room) return c.text("error occured while creating a group",400);

    return c.json({message:"room created/already existed",data:room});

}

export const getRoomUsers = async (c: Context) => {
    const roomSlug = c.req.query("slug");

    if (!roomSlug) return c.text("Invalid room slug", 401);

    const roomUsers = await findRoomBySlug(roomSlug);

    if (!roomUsers) return c.text("Room doesn't exist", 400);

    return c.json({ message: "Room found", data: roomUsers });
};

export const updateRoomApi=async(c:Context)=>{
    const { roomSlug, userIds, name, type } = await c.req.json();

    const updatedRoom=await updateGroup(roomSlug,userIds,name,type);

    if(!updateGroup) return c.text("error occured while updating",400);

    return c.json({message:"room updated successfully",data:updatedRoom},200)
}

export const deleteRoomApi=async(c:Context)=>{
    const roomSlug=c.req.query("roomSlug");

    const deletedRoom=await deleteGroup(roomSlug);

    if(!deletedRoom) return c.text("error occured while deleting the room",400);

    return c.json({message:"room deleted successfully",data:deletedRoom},200);
}


export const getChatsApi=async(c:Context)=>{

    const roomSlug=c.req.query("slug"),
    prevCursor=c.req.query("cursor") || "",
    limit=parseInt(c.req.query("limit") || "7");

    const result:cursorChat | string=await getChatsFromRoom(roomSlug,prevCursor,limit);
    
    if(!result || typeof result ==='string') return c.text("Chats not found",400);

    return c.json({message:"Chats found",data:{
        chats:result.chat,
        nextCursor:result.nextCursor
    }})
}

