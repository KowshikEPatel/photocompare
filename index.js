require('dotenv').config()
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const bodyParserjson = require('body-parser').json();

const app = express();
app.set('view engine','ejs');
app.use(bodyParserjson);
app.use(methodOverride('_method'));
const dbURL = process.env.dbURL;
const conn = mongoose.createConnection(dbURL,{useNewUrlParser: true, useUnifiedTopology: true});

let gfs;
conn.once('open',()=>{
    gfs = Grid(conn.db,mongoose.mongo);
    gfs.collection('uploads');
})

const storage = new GridFsStorage({
    url:dbURL,
    file:(req,file)=>{
        return new Promise((resolve,reject) =>{
            crypto.randomBytes(16,(err,buf)=>{
                if(err){
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename:filename,
                    bucketName:'uploads'
                };
                resolve(fileInfo);
            })
        })
    }
})
const upload = multer({storage})

const port  = process.env.PORT|| 8000


app.get('/',(req,res)=>{
    res.render('index')
})

app.get("/add",(req,res)=>{
    res.render("add")
})

io.on('connection',(socket)=>{
    console.log('a new connection ')
    socket.emit('message','Welcome to whatsapplike')
    socket.on('disconnect',()=>{
        io.emit('message','a user has left the chat')
    })
})
//route post upload desc uploads file ot db
app.post('/upload', upload.single('file'),(req,res)=>{
    res.redirect('/')
})

//route get /files
app.get('/files',(req,res)=>{

    gfs.files.find().toArray((err,files)=>{
        if(!files||files.length ===0){
            return res.status(404).json({
                err:'No files exist'
            })
        }
        return res.json(files)
    })

})

app.get('/files/:filename',(req,res)=>{

    gfs.files.findOne({filename:req.params.filename},(err,file)=>{
        if(!file||file.length ===0){
            return res.status(404).json({
                err:'No file exist'
            })
        }
        return res.json(file)
    })

})

app.get('/image/:filename',(req,res)=>{

    gfs.files.findOne({filename:req.params.filename},(err,file)=>{
        if(!file||file.length ===0){
            return res.status(404).json({
                err:'No file exist'
            })
        }
        //check if image
        if(file.contentType ==='image/jpeg'||file.contentType === 'image/png'){
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res)
        } else {
            res.status(404).json({
                error:"not an image"
            });
        }
    })

})


app.listen(port,()=> console.log('server started on port ',port))