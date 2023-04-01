const mongoose = require('mongoose')

const Student = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true },
        SAnumber: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        birthday: { type: Date, required: true },
        phoneNumber: { type: Number, required: true },
        password: { type: String, required: true },
        // profilePicture: { type: String },
        // verified: { type: Boolean, default: false }
    },
    { collection: 'student_profile' }
)

const model = mongoose.model('StudentData', Student)

module.exports = model