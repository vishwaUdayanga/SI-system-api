require("dotenv").config()
const express = require('express')
const app = express()
const mongoose = require('mongoose')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const StudentProfile = require('./models/studentProfile')
app.use(cors())
app.use(express.json({limit: '2mb'}));
// app.use(express.urlencoded({limit: '2mb'}))

mongoose.connect(process.env.DATABASE_URI).then(() => {
    console.log("Connected to the database")

    app.listen(process.env.PORT, () => {
        console.log("server running at 1337")
    })
}).catch((error) => {
    console.log(error.message)
})

app.post('/api/sign-up-student', async (req, res) => {
    try {
        const newPassword = await bcrypt.hash(req.body.password, 10)
        const student = await StudentProfile.create({
            email: req.body.email,
            SAnumber: req.body.SAnumber,
            name: req.body.name,
            birthday: req.body.birthday,
            phoneNumber: req.body.phoneNumber,
            password: newPassword,
            profilePicture: { type: String },
            verified: { type: Boolean, default: false }
        })
        res.json({ registered: 'done' })
    //     const token = await new Token({
    //         userId: user._id,
    //         token: crypto.randomBytes(32).toString("hex")
    //     }).save()
    //     const url = `http://localhost:3000/users/${user._id}/verify/${token.token}`
    //     await sendEmail(user.email, "Verify Email", url)
    //     res.json({ status: 'An email sent to your account please verify!', registered: 'done' })
    } catch (error) {
        res.json({ status: 'error', error: error.message })
        console.log(error.message)
    }
})