import express from 'express'
import cors from "cors"
import multer from 'multer'
import {v4 as uuidv4} from 'uuid'
import path from 'path'
import dotenv from 'dotenv'
import fs from 'fs'
import {exec} from 'child_process'
import { stderr, stdout } from 'process'
dotenv.config();
const app = express()

// const AWS = require('aws-sdk');

// AWS.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_ACCESS_KEY_ID,
//   region: process.env.AWS_REGION,
// });

// const s3 = new AWS.S3();

//multer middleware
const storage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,'./uploads')
    },
    filename:function(req,file,cb){
        cb(null,file.fieldname + '-' + uuidv4() + path.extname(file.originalname))
    }
})

//multer configrations
const upload = multer({
    storage: storage
  })

app.use(cors({
    origin:"*"
}))

app.use((req,res,next)=>{
    res.header("Access-Control-Allow-Origin","*")
    next();
})

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use('/uploads',express.static('uploads'))

app.get('/',function(req,res){
    res.json({"message":"server is listening you"})
})

app.post('/upload',upload.single('file'),function(req,res){
    // console.log("file uploaded")
    const lessonId= uuidv4()
    const videoPath = req.file.path
    const outputPath = `./uploads/courses/${lessonId}`
    const hlsPath = `${outputPath}/index.m3u8`
    console.log("hlsPath",hlsPath)

    if(!fs.existsSync(outputPath)){
        fs.mkdirSync(outputPath,{recursive:true})
    }

    //ffmpeg
    const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`

    //no que because of POC , not to be done in production
    exec(ffmpegCommand,(error,stdout,stderr)=>{
        if(error){
            console.log(`exec error:${error}`)
        }
        console.log(`stdout: ${stdout}`)
        console.log(`stderr: ${stderr}`)
        
        const videoUrl = `http://3.108.26.248:8000/uploads/courses/${lessonId}/index.m3u8`
        res.json({message:"file uploaded",videoUrl,lessonId})
    })

    // res.json({"message":"file uploaded"})
})

app.listen(8000,()=>{console.log("listening at 8000")})