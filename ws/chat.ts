import { getPrismaClient } from "../database/init";
import { expireString, getString, setString } from "../database/operations";
import type { Context } from "hono";

const prismaClient = await getPrismaClient();

export async function createDM(userIds: string[]) {
    if (!userIds) return null;
    return await createRoom(userIds);
}

export async function createGroup(userIds: string[], name: string, isGroup: boolean = true) {
    if (!userIds || !name) return null;
    const room = await findRoomUsingSlug(userIds, isGroup);
    if (room) return room;
    return await createRoom(userIds, name);
}

export const getRoomUsers = async (c: Context) => {
    const roomSlug = c.req.query("slug");

    if (!roomSlug) return c.text("Invalid room slug", 401);

    const roomUsers = await findRoomBySlug(roomSlug);

    if (!roomUsers) return c.text("Room doesn't exist", 400);

    return c.json({ message: "Room found", data: roomUsers });
};

export const updateGroup = async (c: Context) => {
    const { roomSlug, userIds, name, type } = await c.req.json();

    const room = await findRoomBySlug(roomSlug);
    if (!room) return c.text("Room doesn't exist", 401);

    if (type === "update") {
        const existingUserIds = room.users.map((u: any) => u.id);
        const users = Array.from(new Set([...existingUserIds, ...userIds]));
        let data: any = {};

        if (userIds) data.users = users;
        if (name) data.name = name;

        const updatedRoom = await prismaClient.room.update({
            where: {
                roomSlug: roomSlug
            },
            data: data.users
                ? {
                      users: {
                          connect: data.users.map((id: string) => ({ id }))
                      }
                  }
                : {
                      name: data.name
                  },
            select: {
                users: {
                    select: {
                        id: true
                    }
                },
                createdAt: true,
                updatedAt: true
            }
        });

        await setString(
            `room:${roomSlug}`,
            { users: updatedRoom.users, createdAt: updatedRoom.createdAt, updatedAt: updatedRoom.updatedAt },
            3600
        );

        return c.json({ message: "Room updated successfully", data: updatedRoom }, 200);
    } else if (type === "delete") {
        const updatedRoom = await prismaClient.room.update({
            where: {
                roomSlug: roomSlug
            },
            data: {
                users: {
                    disconnect: userIds.map((id: string) => ({ id }))
                }
            },
            select: {
                users: {
                    select: {
                        id: true
                    }
                },
                createdAt: true,
                updatedAt: true
            }
        });

        await setString(
            `room:${roomSlug}`,
            { users: updatedRoom.users, createdAt: updatedRoom.createdAt, updatedAt: updatedRoom.updatedAt },
            3600
        );

        return c.json({ message: "Room updated successfully", data: updatedRoom }, 200);
    } else return c.text("Invalid type", 401);
};

export const deleteGroup = async (c: Context) => {
    const roomSlug = c.req.query("slug");
    if (!roomSlug) return c.text("Invalid room slug", 401);

    let room = await findRoomBySlug(roomSlug);
    if (!room) return c.text("Room not found", 400);

    room = await prismaClient.room.delete({
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
    return c.json({ message: "Room deleted successfully", data: room });
};

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

async function findRoomBySlug(roomSlug: string) {
    const cachedRoom = await getString(`room:${roomSlug}`);
    if (cachedRoom) return cachedRoom;

    const room = await prismaClient.room.findFirst({
        where: {
            roomSlug: roomSlug
        },
        select: {
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
        { users: room.users.sort(), createdAt: room.createdAt, updatedAt: room.updatedAt },
        3600
    );

    return room;
}

export const getChatsFromRoom = async (c: Context) => {
    const roomSlug = c.req.query("slug");
    const prevCursor = c.req.query("cursor");

    if (!roomSlug) c.text("Invalid room slug", 401);

    
};


export function dmRoomSlugGenerator(userIds: string[]): string {
    const uids = Array.from(userIds);
    const [u1, u2] = uids.sort();
    return `dm_${u1}_${u2}`;
}

export function groupRoomSlugGenerator(users: string[]) {
    const sorted = [...users].sort();

    return `group_${sorted.join("_")}`;
}

export async function findRoomUsingSlug(users: string[], isGroup: boolean = false) {
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