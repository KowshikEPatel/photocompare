require('dotenv').config()
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const ejs=require("ejs");
const methodOverride = require('method-override');
const bodyParserjson = require('body-parser').json();

const app = express();
app.set('view engine','ejs');
app.use(bodyParserjson);
app.use(methodOverride('_method'));
const dbURL = process.env.dbURL;
const conn = mongoose.createConnection(dbURL,{useNewUrlParser: true, useUnifiedTopology: true});
mongoose.connect(dbURL, {useNewUrlParser: true, useUnifiedTopology: true});
let filemonarray = new mongoose.Schema({"filename":String,"upvotes":Number})
const FilemonarrayModel = mongoose.model("imagearray",filemonarray);

let gfs;
conn.once('open',()=>{
    gfs = Grid(conn.db,mongoose.mongo);
    gfs.collection('uploads');
})

const storage = new GridFsStorage({
    url:dbURL,
    file:(req,file)=>{
        if(file.mimetype==='image/jpeg'||file.mimetype==='image/png'){
            return new Promise((resolve,reject) =>{
                crypto.randomBytes(16, async(err,buf)=>{
    
                    if(err){
                        return reject(err);
                    }
                    const filename = buf.toString('hex') + path.extname(file.originalname);
                    let savepostmod = new FilemonarrayModel({"filename":filename,"upvotes":0})
                    let savepost = await savepostmod.save()
                    
                    const fileInfo = {
                        filename:filename,
                        bucketName:'uploads'
                    };
                    resolve(fileInfo);
                })
            })
        }
    }
})
const upload = multer({storage})

const port  = process.env.PORT|| 8000


app.get('/',(req,res)=>{
    res.render('index')
})

app.get("/add",(req,res)=>{
    res.render("add",{
        message: 1 
    })
})

app.get("/allimages",(req,res)=>{
    res.render("allimages")
})

//route post upload desc uploads file ot db
app.post('/upload', upload.single('file'),(req,res)=>{
    
    if(req.file.mimetype==='image/jpeg'||req.file.mimetype==='image/png'){
        res.render('add',{
            message: 0 
        })
    }
    else{
        res.render('add',{
            message: 2 
        })
    }
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

app.get("/upvote/:id", async (req,res)=>{

    let doc = await FilemonarrayModel.findOne({"filename":req.params.id});
    doc["upvotes"]+=1;
    await doc.save();
    res.status(200)
})

app.get("/filearray", async (req,res)=>{

    let result = await FilemonarrayModel.find({});
    res.status(200).json(result);
})


app.listen(port,()=> console.log('server started on port ',port))