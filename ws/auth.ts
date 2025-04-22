import { verify } from "hono/jwt";
import { getString } from "../database/operations";

export const wsAuthenticator=async(req:Request)=>{
    const authHeader=req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token=authHeader.split(' ')[1]!,
    payload= await verify(token,process.env.JWT_SECRET || "");
    const session=await getString(`session:${payload.id}`);

    if(!session || session !==token) return null
    return payload
}

