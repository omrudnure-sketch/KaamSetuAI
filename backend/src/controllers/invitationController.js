import {
  inviteWorker,
  getWorkerInvitations,
  getEmployerInvitations,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
} from '../services/invitationService.js';
import { validateCreateInvitation } from '../validators/invitationValidator.js';

export const handleInviteWorker = async (req, res, next) => {
  try {
    const validation = validateCreateInvitation(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: { message: validation.error },
      });
    }

    const invitation = await inviteWorker(req.user.id, validation.data);
    res.status(201).json({
      success: true,
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetWorkerInvitations = async (req, res, next) => {
  try {
    const invitations = await getWorkerInvitations(req.user.id, req.query);
    res.status(200).json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetEmployerInvitations = async (req, res, next) => {
  try {
    const invitations = await getEmployerInvitations(req.user.id, req.query);
    res.status(200).json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    next(error);
  }
};

export const handleAcceptInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invitation = await acceptInvitation(req.user.id, id);
    res.status(200).json({
      success: true,
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
};

export const handleRejectInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invitation = await rejectInvitation(req.user.id, id);
    res.status(200).json({
      success: true,
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
};

export const handleCancelInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invitation = await cancelInvitation(req.user.id, id);
    res.status(200).json({
      success: true,
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
};
