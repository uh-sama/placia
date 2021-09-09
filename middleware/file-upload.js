const multer = require('multer');
const { uuid } = require('uuidv4');

const MIME_TYPE_MAP = {
    'image/png': 'png',
    'image/jpg': 'jpg',
    'image/jpeg': 'jpeg'
};

const fileUpload = multer({
    limits: 5000000,
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/images');
        },
        filename: (req, file, cb) => {
            const ext = MIME_TYPE_MAP[file.mimetype];
            cb(null, uuid + '.' + ext);
        },
        fileFilter: (req, file, cb) => {
            const isValid = !!MIME_TYPE_MAP[file.mimetype];
            const error = isValid ? null : new Error('Invalid mime type');
            cb(error, isValid);
        }
    })
});

module.exports = fileUpload;