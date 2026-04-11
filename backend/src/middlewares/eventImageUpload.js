import multer from "multer";

const EVENT_IMAGE_ERROR =
  "Event image must be a JPEG, PNG, or WebP file under 5MB";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error(EVENT_IMAGE_ERROR));
    }

    return cb(null, true);
  }
});

const eventImageUpload = (req, res, next) => {
  if (!req.is("multipart/form-data")) {
    return next();
  }

  return upload.single("cover_image")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (
      error instanceof multer.MulterError ||
      error.message === EVENT_IMAGE_ERROR
    ) {
      return res.status(400).json({
        success: false,
        message: EVENT_IMAGE_ERROR
      });
    }

    return next(error);
  });
};

export default eventImageUpload;

