
export interface room{
    id:string,
    users:{
        id:string
    }[],
    createdAt:Date,
    updatedAt:Date
}

export interface chatPayload{
    room:string | undefined,
    content:string,
    createdAt:string,
    senderId:string
}
