import { Router } from 'express';
import Conversation from '../models/Conversation.js';
import auth from '../middleware/auth.js';

const router = Router();

// New conversation
router.post('/', auth, async (req, res) => {
  const newConversation = new Conversation({
    participants: [req.user.id, req.body.receiverId],
  });

  try {
    const savedConversation = await newConversation.save();
    res.status(200).json(savedConversation);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Find or create conversation
router.post('/find-or-create', auth, async (req, res) => {
  try {
    const { receiverId } = req.body;

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: {
        $all: [req.user.id, receiverId]
      }
    });

    // If no conversation exists, create a new one
    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user.id, receiverId]
      });
      await conversation.save();
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: 'Error finding or creating conversation' });
  }
});

// Get conversations of a user
router.get('/', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: { $in: [req.user.id] },
    })
      .populate('participants', 'name profilePhoto')
      .sort({ lastMessageTime: -1 });

    // Format conversations for frontend
    const formattedConversations = conversations.map(conv => {
      const recipient = conv.participants.find(p => p._id.toString() !== req.user.id);
      return {
        _id: conv._id,
        recipientId: recipient._id,
        recipientName: recipient.name,
        recipientPhoto: recipient.profilePhoto,
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime
      };
    });

    res.status(200).json(formattedConversations);
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
