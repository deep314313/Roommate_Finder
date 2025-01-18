import { Router } from 'express';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import auth from '../middleware/auth.js';

const router = Router();

// Add message
router.post('/', auth, async (req, res) => {
  const newMessage = new Message({
    conversationId: req.body.conversationId,
    sender: req.user.id,
    text: req.body.text,
  });

  try {
    const savedMessage = await newMessage.save();
    
    // Update conversation's last message
    await Conversation.findByIdAndUpdate(req.body.conversationId, {
      lastMessage: req.body.text,
      lastMessageTime: Date.now()
    });

    res.status(200).json(savedMessage);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get messages
router.get('/:conversationId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId,
    });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
