import * as adminAssistantService from '../services/ai/adminAssistantService.js';

export const handleAdminQuery = async (req, res, next) => {
  try {
    const result = await adminAssistantService.processAdminQuery(req.body, req.user);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: { message: error.errors[0]?.message || 'Invalid assistant query' },
      });
    }
    next(error);
  }
};

export const handleGetHistory = async (req, res, next) => {
  try {
    const history = await adminAssistantService.getAdminConversationHistory(req.user._id || req.user.id);
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

export default {
  handleAdminQuery,
  handleGetHistory,
};
