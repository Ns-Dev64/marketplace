import type { Context } from "hono";
import { imageUploader, deleteImage, isSamePublicId } from "../helpers/helper";
import { getPrismaClient } from "../database/init";
import { setString, getString, variableAssets } from '../database/operations';
import { sign } from "hono/jwt";
import { Type,SubType, type Item } from "../generated/prisma";
const prismaClient = await getPrismaClient();

export const createItem = async (c: Context) => {

    const form = await c.req.formData();

    const files = form.getAll("images") as File[];
    const productName = form.get("name")?.toString() || "";
    const productDescription = form.get("description")?.toString() || "";
    const price = Number(form.get("price"));
    const type = form.get("type")?.toString() || "";
    const subType = form.get("subType")?.toString() || "";

    for(const file of files){
        if (!file || file.type.split('/')[0] !== 'image') {
            return c.text('Invalid image file', 400)
        }
    }

    const user=c.get("jwtPayload");

    const uploadedImage = await Promise.all(files.map(async file=> await imageUploader(file,`user:${user.id}`)));
    const secureUrls= uploadedImage.map(image => image.secure_url);

    const item = await prismaClient.item.create({
        data: {
            productName: productName,
            productDescription: productDescription,
            productImgUrl:secureUrls,
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

    const publicId= c.req.query("iid");
    const postId=c.req.query("pid");

    if(!publicId || !postId) return c.text("Error occured while deleting Image",401);

    const post=await fetchPost(`item:${postId}`);

    if(!post) return c.text("Invalid Post",400);

    const res=await deleteImage(publicId);
    if(res.result!=="ok") return c.text(res.result,400);
    
    const secure_urls:string[]=post.productImgUrl.filter((url:string)=> !isSamePublicId(url,publicId))
    
    await prismaClient.item.update({
        where:{
            id:postId
        },
        data:{
            productImgUrl:{
                set:[...secure_urls]
            }
        }
    })

    return c.json({message:"Image deleted successfully",data:{image:publicId}})
    
}

export const updateImagePost=async(c:Context)=>{

  const body=await c.req.formData();
  
    const postId=body.get("pid")?.toString();
    const publicId=body.get("iid")?.toString();
    const file=body.get("image") as File
    let secure_urls:string[]=[];

    if (!file || file.type.split('/')[0] !== 'image') {
        return c.text('Invalid image file', 400)
    }

    if(!postId) return c.text("Error occured while deleting Image",401);

    const user=c.get("jwtPayload");
    const post=await fetchPost(`item:${postId}`);
    
    if(!post) return c.text("Invalid Post",400);
   
    if(publicId){
        const res=await deleteImage(publicId);
        if(res.result!=="ok") return c.text(res.result,400);
        secure_urls=post.productImgUrl.filter((url:string) => !isSamePublicId(url,postId));
    }

    else secure_urls=post.productImgUrl
    
    const uploader=await imageUploader(file,`user:${user.id}`);

    const updatedPost=await prismaClient.item.update({
        where:{
            id:postId
        },
        data:{
           productImgUrl:{
            set:[...secure_urls,uploader.secure_url]
           } 
        }
    })

    await setString(`item:${postId}`,updatedPost);

    return c.json({message:'Image updated successfully'},200)

}

async function fetchPost(postId:string) {

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


