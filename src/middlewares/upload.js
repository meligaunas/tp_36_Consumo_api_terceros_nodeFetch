const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination : function (req,file,callback) {
        callback(null, 'public/img')
    },
    filename : function (req,file,callback){
        callback(null, `${Date.now()}_movie${path.extname(file.originalname)}`)
    }
})

const upload = multer ({
    storage
})

module.exports = upload