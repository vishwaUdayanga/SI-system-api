const mongoose = require('mongoose')

const SentAnnouncementsWhatsapp = new mongoose.Schema(
    {
        announcementId: { type: String, required: true, unique: true },
    },
    { collection: 'sent_announcements_whatsapp' }
)

const model = mongoose.model('AnnouncementDataWhatsapp', SentAnnouncementsWhatsapp)

module.exports = model