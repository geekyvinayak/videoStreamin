import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { exec } from 'child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'; // AWS SDK v3 imports

dotenv.config();

const app = express();

// Configure S3Client with credentials and region
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Multer middleware
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads'); // Temporarily store the video file
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + uuidv4() + path.extname(file.originalname));
    },
});

// Multer configurations
const upload = multer({
    storage: storage,
});

app.use(cors({
    origin: '*',
}));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.get('/', function (req, res) {
    res.json({ message: 'server is listening to you' });
});

app.post('/upload', upload.single('file'), function (req, res) {
    const lessonId = uuidv4();
    const videoPath = req.file.path;
    const outputPath = `./uploads/courses/${lessonId}`;
    const hlsPath = `${outputPath}/index.m3u8`;

    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    // Run ffmpeg to convert the video into HLS format
    const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;

    exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: 'Video processing failed' });
        }

        // Upload files to S3
        const uploadToS3 = async (filePath, key) => {
            const fileContent = fs.readFileSync(filePath);
            const params = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key, // File name in the S3 bucket
                Body: fileContent
            };
            try {
                const command = new PutObjectCommand(params);
                await s3.send(command);
                console.log(`File uploaded successfully: ${key}`);
            } catch (err) {
                console.error('S3 upload error:', err);
            }
        };

        const uploads = [];
        const hlsFiles = fs.readdirSync(outputPath); // Read all files from the output directory
        hlsFiles.forEach((file) => {
            const filePath = path.join(outputPath, file);
            const key = `courses/${lessonId}/${file}`;
            uploads.push(uploadToS3(filePath, key)); // Upload each file to S3
        });

        Promise.all(uploads)
            .then(() => {
                const videoUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/courses/${lessonId}/index.m3u8`;
                res.json({ message: 'File uploaded successfully', videoUrl, lessonId });
            })
            .catch((err) => {
                console.error('S3 upload error:', err);
                res.status(500).json({ error: 'Failed to upload files to S3' });
            });
    });
});

app.listen(8000, () => {
    console.log('Listening at 8000');
});
