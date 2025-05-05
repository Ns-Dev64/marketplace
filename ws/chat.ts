import { getPrismaClient } from "../database/init";
import { expireString, getString, setString } from "../database/operations";
import type { MessageRead } from "../generated/prisma";
import type { cursorChat } from "./chat.types";
import {createHash} from "crypto";

const prismaClient = await getPrismaClient();

export async function createDM(userIds: string[]) {
    if (!userIds) return null;
    return await createRoom(userIds);
}

export async function createGroup(userIds: string[], name: string, isGroup: boolean = true) {
    if (!userIds || !name) return null;
    const room = await findRoomUsingUsers(userIds, isGroup);
    if (room) return room;
    return await createRoom(userIds, name);
}

export async function updateGroup(
    roomSlug: string,
    userIds: string[] | string,
    name: string | undefined,
    type: string
): Promise<any> {
    const room = await findRoomBySlug(roomSlug);
    if (!room) return ""; 

    const isArray = Array.isArray(userIds);
    const existingUserIds = room.users.map((u: any) => u.id);

    if (type === "update") {
        const users: string[] = isArray
            ? Array.from(new Set([...existingUserIds, ...userIds]))
            : Array.from(new Set([...existingUserIds, userIds]));
        let data: any = {};
        let newSlug;

        if (userIds) {
            data.users = users;
            newSlug = groupRoomSlugGenerator(users);
        }
        if (name) data.name = name;

        const updatedRoom = await prismaClient.room.update({
            where: {
                roomSlug: roomSlug
            },
            data: data.users
                ? {
                      roomSlug: newSlug,
                      users: {
                          connect: data.users.map((id: string) => ({ id }))
                      }
                  }
                : {
                      name: data.name
                  },
            select: {
                roomSlug:true,
                users: {
                    select: {
                        id: true
                    }
                },
                createdAt: true,
                updatedAt: true
            }
        });

        await expireString(`room:${roomSlug}`);

        await setString(
            `room:${newSlug}`,
            { users: updatedRoom.users, createdAt: updatedRoom.createdAt, updatedAt: updatedRoom.updatedAt },
            3600
        );

        return updatedRoom
    } else if (type === "delete") {
        const userArray: Set<string> = isArray ? new Set(Array.from(userIds)) : new Set([userIds]);
        const newUsers = existingUserIds.filter((user: string) => !userArray.has(user));

        let newSlug = groupRoomSlugGenerator(newUsers);

        const updatedRoom = await prismaClient.room.update({
            where: {
                roomSlug: roomSlug
            },
            data: {
                roomSlug: newSlug,
                users: {
                    disconnect: Array.from(userArray).map((id: string) => ({ id }))
                }
            },
            select: {
                users: {
                    select: {
                        id: true
                    }
                },
                roomSlug: true,
                createdAt: true,
                updatedAt: true
            }
        });

        await expireString(`room:${roomSlug}`);

        await setString(
            `room:${newSlug}`,
            { users: updatedRoom.users, createdAt: updatedRoom.createdAt, updatedAt: updatedRoom.updatedAt },
            3600
        );

        return updatedRoom;
    }

    return ""; 
}


export async function deleteGroup(roomSlug: string | undefined): Promise<string | object> {
    if (!roomSlug) return ""; 

    const room = await findRoomBySlug(roomSlug);
    if (!room) return ""; 

    const deletedRoom = await prismaClient.room.delete({
        where: {
            roomSlug: roomSlug
        },
        select: {
            users: {
                select: {
                    id: true
                }
            }
        }
    });

    await expireString(`room:${roomSlug}`);

    return deletedRoom
}

async function createRoom(users: string[], name: string | null = null) {
    const room = await prismaClient.room.create({
        data: name
            ? {
                  name: name,
                  isGroup: true,
                  roomSlug: groupRoomSlugGenerator(users),
                  users: {
                      connect: users.map((id) => ({ id }))
                  }
              }
            : {
                  isGroup: false,
                  roomSlug: dmRoomSlugGenerator(users),
                  users: {
                      connect: users.map((id) => ({ id }))
                  }
              },
        select: name
            ? {
                roomSlug:true,
                  id: true,
                  name: true,
                  createdAt: true,
                  users: {
                      select: {
                          id: true
                      }
                  },
                  updatedAt: true
              }
            : {
                roomSlug:true,
                  users: {
                      select: {
                          id: true
                      }
                  },
                  updatedAt: true,
                  id: true,
                  createdAt: true
              }
    });

    await setString(
        `room:${room.roomSlug}`,
        { users: users.sort(), createdAt: room.createdAt, updatedAt: room.createdAt },
        3600
    );

    return room;
}

export async function findRoomBySlug(roomSlug: string) {
    const cachedRoom = await getString(`room:${roomSlug}`);
    if (cachedRoom) return cachedRoom;

    const room = await prismaClient.room.findFirst({
        where: {
            roomSlug: roomSlug
        },
        select: {
            roomSlug:true,
            id:true,
            users: {
                select: {
                    id: true
                }
            },
            createdAt: true,
            updatedAt: true
        }
    });

    if (!room) return false;
    await setString(
        `room:${roomSlug}`,
        { users: room.users.sort(),id:room.id, createdAt: room.createdAt, updatedAt: room.updatedAt },
        3600
    );

    return room;
}


export function dmRoomSlugGenerator(userIds: string[]): string {
    const uids = Array.from(userIds);
    const [u1, u2] = uids.sort();

    let slug=`dm_${u1}_${u2}`;

    return createHash('md5').update(slug,'utf-8').digest('hex').substring(0,10);
}

export function groupRoomSlugGenerator(users: string[]) {
    const sorted = [...users].sort();

    let slug=`group_${sorted.join("_")}`;

    return createHash('md5').update(slug,'utf-8').digest('hex').substring(0,10);
}

export async function findRoomUsingUsers(users: string[], isGroup: boolean = false) {
    const sortedUsers = users.sort();

    const slug = isGroup ? groupRoomSlugGenerator(sortedUsers) : dmRoomSlugGenerator(sortedUsers);
    console.log(slug)
    const cachedRoom=await getString(`room:${slug}`);
    if(cachedRoom) return cachedRoom

    const room = await prismaClient.room.findFirst({
        where: {
            roomSlug: slug
        },
        select: {
            roomSlug:true,
            id: true,
            createdAt: true,
            users: {
                select: {
                    id: true
                }
            },
            updatedAt: true
        }
    });

    if (!room) return null;

    await setString(
        `room:${room.roomSlug}`,
        {
            id: room.id,
            users: room.users,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt
        },
        3600
    );

    return room;
}


export async function getChatsFromRoom(roomSlug:string|undefined,prevCursor:string,limit:number) :Promise<cursorChat|string>{

    if(!roomSlug) return  "";

    const room=await findRoomBySlug(roomSlug);

    if(!room) return "";

    const results =await prismaClient.message.findMany({
        where:prevCursor ? {
            roomId:room.id,
            createdAt:{
                lt:prevCursor
            }
        }:{
        roomId:room.id
        },
        orderBy:{
            createdAt:"desc"
        },
        take:limit
    });

    if(!results || results.length===0 ) return ""

    const nextCursor= results.length >0 ? results[results.length-1]?.createdAt! : null;

    const payload:cursorChat={
        chat:results,
        nextCursor:nextCursor
    }

    return payload

}


export async function getUserIdFromMessage(messageId:string) :Promise<string> {

    if(!messageId) return '';

    const uid=await prismaClient.message.findFirst({
        where:{
            id:messageId
        },
        select:{
            senderId:true
        },
    });

    if(!uid) return '';

    return uid.senderId;

}