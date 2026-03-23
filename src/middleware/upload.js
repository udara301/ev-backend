import multer from "multer";
import path from "path";

// location to save uploaded files and how to name them
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/vehicles/'); // uploads/vehicles folder is used to save vehicle images
    },
    filename: (req, file, cb) => {
        // Add a timestamp to the file name to avoid conflicts with files having the same name
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Check if the file is an image
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed!'), false);
    }
};

export const upload = multer({ storage, fileFilter });