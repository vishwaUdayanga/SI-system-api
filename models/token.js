const mongoose = require('mongoose')

const Token = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "student",
            unique: true
        },
        token: { type: String, required: true },
        createdAt: { type: Date, default: Date.now(), expires: 3600 }
    }
)

const model = mongoose.model('token', Token)
module.exports = model