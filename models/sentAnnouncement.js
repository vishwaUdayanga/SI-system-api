const mongoose = require('mongoose')

const SentAnnouncements = new mongoose.Schema(
    {
        announcementId: { type: String, required: true, unique: true },
    },
    { collection: 'sent_announcements' }
)

const model = mongoose.model('AnnouncementData', SentAnnouncements)

module.exports = model