import type { Message } from "../generated/prisma"

export type room={
    id:string,
    users:{
        id:string
    }[],
    createdAt:Date,
    updatedAt:Date
}

export type chatPayload={
    room:string | undefined,
    content:string,
    createdAt:string,
    senderId:string
}

export type markMessage={
    messageId:string,
    userId:string | string[],
}

export type cursorChat={
    chat:Message[],
    nextCursor:Date | null
}