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
const sentAnnouncement = require('./models/sentAnnouncement')
const SentAnnouncementsWhatsapp = require('./models/sentAnnouncementWhatsapp')
const sendAnnouncement = require("./utils/sendAnnouncement")
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
            if (student.email === process.env.ADMIN_1) {
                const generatedTokenAdmin = jwt.sign(
                    {
                        email: student.email,
                        name: student.name,
                        user: "Admin"
                    },
                    process.env.SECRET
                )
                return res.json({ status: 'ok', student: generatedTokenAdmin })
            } else {
                const generatedTokenAdmin = jwt.sign(
                    {
                        email: student.email,
                        name: student.name
                    },
                    process.env.SECRET
                )
                return res.json({ status: 'ok', student: generatedTokenAdmin })
            }
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

app.get('/api/student/get-verified', async (req, res) => {
    const token = req.headers['x-access-token']
    try {
        const decoded = jwt.verify(token, process.env.SECRET)
        const email = decoded.email
        const user = decoded.user
        const student = await StudentProfile.findOne({ email: email })
        if (user === "Admin") {
            return res.json({ status: 'ok', email: student.email, profilePicture: student.profilePicture, name: student.name, user: "Admin", phoneNumber: student.phoneNumber, birthday: student.birthday, SAnumber: student.SAnumber })
        } else {
            return res.json({ status: 'ok', email: student.email, profilePicture: student.profilePicture, name: student.name, user: "Student", phoneNumber: student.phoneNumber, birthday: student.birthday, SAnumber: student.SAnumber })
        }
    } catch (error) {
        console.log(error)
        res.json({ status: 'error', error: 'Invalid token' })
    }
})

app.post('/api/student/upload-profile-pic' , async (req, res) => {
    const token = req.headers['x-access-token']
    const payload = req.body.payload
    try {
        const decoded = jwt.verify(token, process.env.SECRET)
        const updatePicStudent = await StudentProfile.updateOne(
            { email: decoded.email },
            { $set : { profilePicture : payload }}
        )
        res.json({ status: 'ok', updated: 'student' }) 
    } catch (error) {
        console.log(error.message)
        res.json({ error: error })
    }
})

app.get('/api/student/get-birthday-list', async (req, res) => {
    const today = new Date()

    try {
        const birthdayList = await StudentProfile.aggregate([
            {
              "$match": {
                $expr: {
                  "$eq": [{ "$month": "$birthday" }, today.getMonth()+1 ]
                }
              }
            },
            {
                "$match": {
                  $expr: {
                    "$eq": [{ "$dayOfMonth": "$birthday" }, today.getDate() ]
                  }
                }
              }
        ])
        res.json({status: 'ok', birthdayList: birthdayList}) 
    } catch (error) {
        console.log(error.message)
        res.json({ error: error })
    }
})

app.post('/api/send-announcement' , async (req, res) => {
    const announcementId = req.headers['announcement-id']
    try {
        const emails = await StudentProfile.find()
        const emailArray = []
        emails.map(record => 
            emailArray.push(record.email)
        )
        await sentAnnouncement.create({
            announcementId: announcementId,
        })
        await sendAnnouncement(emailArray, "New Announcement | SI-System", req.body.paragraph)
        res.json({status: 'ok', message: 'Announcement sent.'}) 
    } catch (error) {
        console.log(error.message)
        res.json({status: 'error', message: 'error'}) 
    } 
})

app.post('/api/send-announcement-whatsapp' , async (req, res) => {
    const announcementId = req.headers['announcement-id']
    try {
        await SentAnnouncementsWhatsapp.create({
            announcementId: announcementId,
        })
        res.json({status: 'ok', message: 'Announcement sent.'}) 
    } catch (error) {
        console.log(error.message)
        res.json({status: 'error', message: 'error'}) 
    } 
})

app.post('/api/update-student' , async (req, res) => {
    try {
        const updateStudent = await StudentProfile.updateOne(
            { email: req.body.email },
            { $set : {
                SAnumber: req.body.SAnumber,
                name: req.body.name,
                birthday: req.body.birthday,
                phoneNumber: req.body.phoneNumber
            }}
        )
        res.json({ status: 'ok', updated: 'done' }) 
    } catch (error) {
        res.json({ status: 'not' })
        console.log(error.message)
    }
})

const genres = ["Anime", "Emotional", "Hardcore", "Experimental Rock", "Folk Punk", "Gothic Rock", "Grunge", "Hardcore Punk", "Hard Rock", "Indie Rock", "Novelty", "Parody Music", "Stand-up Comedy", "Vaudeville", "Lo-fi"];

app.get('api/genres', (req, res) => {
    res.status(200).send(genres);
})
