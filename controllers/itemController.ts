import type { Context } from "hono";
import { imageUploader, deleteImage } from "../helpers/helper";
import { getPrismaClient } from "../database/init";
import { setString, getString, variableAssets } from '../database/operations';
import { sign } from "hono/jwt";
import { Type,SubType, type Item } from "../generated/prisma";
const prismaClient = await getPrismaClient();

export const createItem = async (c: Context) => {

    const form = await c.req.formData();

    const file = form.get("image") as File;
    const productName = form.get("name")?.toString() || "";
    const productDescription = form.get("description")?.toString() || "";
    const price = Number(form.get("price"));
    const type = form.get("type")?.toString() || "";
    const subType = form.get("subType")?.toString() || "";

    if (!file || file.type.split('/')[0] !== 'image') {
        return c.text('Invalid image file', 400)
    }

    const user=c.get("jwtPayload")
    const uploadedImage = await imageUploader(file);

    const item = await prismaClient.item.create({
        data: {
            productName: productName,
            productDescription: productDescription,
            productImgUrl:uploadedImage.secure_url,
            type:type as Type,
            subType:subType as SubType,
            userId:user.id,
            price:price
        },
    })

    setString(`user:${user.id}:posts`,item);
    return c.json({message:"Post saved successfully",data:item})

}

export const getPostsFromUser= async(c:Context)=>{

    const limit=parseInt(c.req.query("limit") || "5");
    console.log(c.req.query("limit"))
    const user=c.get("jwtPayload")
    const key=`user:${user.id}:posts`

    const posts=await variableAssets(user,key,limit);

    if(!posts) return c.text("User has not yet created any post",400);

    return c.json({message:`Posts for user ${user.id} and limit ${limit} `, data:posts})

}


export const feed=async(c:Context)=>{

    const limit=parseInt(c.req.query("limit") || "7");
    const prevCursor=c.req.query("cursor");


    const results =await prismaClient.item.findMany({
        where:prevCursor?{
            createdAt:{
                lt:prevCursor
            },
        }:{},
        orderBy:{
            createdAt:"desc"
        },
        take:limit
    });

    if(!results || results.length===0 ) return c.text("No posts availble",400);

    const nextCursor= results.length >0 ? results[results.length-1]?.createdAt : null;
    
    return c.json({message:"cursor sent",data:{results,nextCursor}})
}

export const getPostFromId=async(c:Context)=>{
    
    const postId=c.req.query("pid");

    if(!postId) return c.text("invalid post",401);
   
    const post=await fetchPost(postId);

    if(!post) return c.text("Post not found",400);

    return c.json({message:"Post sent",data:post},200)
}




export const updatePostParams=async(c:Context)=>{
    
    const {postId,updateParams}=await c.req.json();

    
    const post=await prismaClient.item.update({
        where:{
            id:postId
        },
        data:updateParams
    });

    await setString(`item:${postId}`,post);
    
    return c.json({message:"Updated successfully"},200);
}

export const deletImage=async(c:Context)=>{

    const postId= c.req.query("pid");

    if(!postId) return c.text("Invalid Post",400);

    
    
}

async function fetchPost(postId:string):Promise<{}> {

    if(!postId) return {}
        const cachedPost=await getString(`item:${postId}`);
    
        if(cachedPost) return cachedPost;
    
        const post=await prismaClient.item.findFirst({
            where:{
                id:postId
            }
        });
    
        if(!post) return {}
    
        await setString(`item${postId}`,post);
        return post;
    
}


