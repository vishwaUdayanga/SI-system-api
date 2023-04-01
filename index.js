require("dotenv").config()
const express = require('express')
const app = express()
const mongoose = require('mongoose')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const Token = require('./models/token')
const sendEmail = require('./utils/sendEmail')
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
        })
        const token = await new Token({
            studentId: student._id,
            token: crypto.randomBytes(32).toString("hex")
        }).save()
        const url = `${process.env.BASE_URL}/student/${student._id}/verify/${token.token}`
        await sendEmail(student.email, "Verify Email", url)
        res.json({ status: 'An email sent to your account please verify!', registered: 'done' })
    } catch (error) {
        res.json({ status: 'error', error: "invalid" })
        console.log(error.message)
    }
})

app.post('/api/sign-in-student', async (req, res) => {
    const student = await StudentProfile.findOne({
        email: req.body.formData.email
    })

    if (!student) {
        return res.json({ status: 'error', error: 'Invalid email' })
    }

    if (!student.verified) {
        let token = await Token.findOne({
            studentId: student._id
        })
        if (!token) {
            token = await new Token({
                studentId: student._id,
                token: crypto.randomBytes(32).toString("hex")
            }).save()
        }
        const url = `${process.env.BASE_URL}/student/${student._id}/verify/${token.token}`
        await sendEmail(student.email, "Verify Email", url)
        res.json({ status: 'An email sent to your account please verify!', message: 'sent an email'})
    } else {
        const IsPasswordValid = await bcrypt.compare(
            req.body.formData.password,
            student.password
        )
        if (IsPasswordValid) {
            const generatedTokenAdmin = jwt.sign(
                {
                    email: student.email,
                    name: student.name
                },
                process.env.SECRET
            )
            return res.json({ status: 'ok', student: generatedTokenAdmin })
        } else {
            return res.json({ status: 'error', student: 'not' })
        }
    }
})

app.get('/api/student/:id/verify/:token', async (req, res) => {
    try {
        const student = await StudentProfile.findOne({_id: req.params.id})
        if (!student) return res.status(400).send({message: "Invalid link"})

        if (student) {
            const token = await Token.findOne({
                studentId: student._id,
                token: req.params.token
            })
            if (!token) return res.status(400).send({message: "Invalid link"})
            await StudentProfile.updateOne({_id: student._id}, {verified: true})
            await Token.deleteOne({
                studentId: student._id,
                token: req.params.token
            })
            res.status(200).send({message: "Email verified successfully", verified: "student"})
        }
    } catch (error) {
        console.log(error.message)
        res.status(500).send({message: "Internal service error"})
    }
})