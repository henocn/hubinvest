const AppError = require('../../shared/app-error');
const roles = require('../../shared/roles');
const { isGlobal } = require('../../shared/access');
const followUpRepository = require('./follow-up.repository');
const settingsService = require('../settings/settings.service');
const notificationService = require('../notification/notification.service');
const { events: realtime } = require('../realtime/realtime.service');

// Relances : une seule page de travail, en onglets (Contacts des stands, Guichets de l'API-ZF).
// Un occupant gère les relances des contacts de son stand ; l'équipe API-ZF voit et gère celles de tous les stands.
const CLASS_SOURCES = ['A', 'B'];

const standOf = (user) => {
  if (isGlobal(user)) return null;
  if (user.role !== roles.OCCUPANT || !user.occupantId) throw new AppError(403, 'FORBIDDEN', 'Vous n’avez pas accès à cette action.');
  return user.occupantId;
};

const assertFuture = (dueAt) => {
  if (new Date(dueAt).getTime() <= Date.now()) throw new AppError(422, 'FOLLOW_UP_IN_PAST', 'Choisissez une date et une heure à venir.');
};

const scheduled = (followUp, contact) => notificationService.contactFollowUpChanged(followUp, contact);
const removedAlert = (followUp) => notificationService.contactFollowUpRemoved(followUp);

// Classe A ou B : la relance automatique (48 h ou 7 jours, comme aux guichets). Une nouvelle classe remplace la relance
// automatique de l'ancienne ; C n'en a pas (la personne est seulement informée des opportunités).
const applyClassFollowUp = async (contact, userId = null) => {
  const previous = await followUpRepository.findPendingContactFollowUps(contact.id, { sources: CLASS_SOURCES });
  await Promise.all(previous.map(async (item) => {
    await followUpRepository.destroyContactFollowUp(item);
    removedAlert(item);
  }));
  const delay = settingsService.investorFollowUpDelay(contact.qualification);
  if (!delay) return null;
  const created = await followUpRepository.createContactFollowUp({
    contactId: contact.id,
    dueAt: new Date(Date.now() + delay),
    reason: `Relance du contact classé ${contact.qualification}`,
    autoSource: contact.qualification,
    createdByUserId: userId,
  });
  scheduled(created, contact);
  return created;
};

const listContacts = async (user) => followUpRepository.findContactFollowUps(standOf(user));
const listGuichets = async () => followUpRepository.findInvestorFollowUps();

const addContact = async (user, contactId, { dueAt, reason }) => {
  const contact = await followUpRepository.findContact(contactId, standOf(user));
  if (!contact) throw new AppError(404, 'CONTACT_NOT_FOUND', 'Contact introuvable.');
  assertFuture(dueAt);
  const followUp = await followUpRepository.createContactFollowUp({ contactId: contact.id, dueAt, reason, createdByUserId: user.id });
  scheduled(followUp, contact);
  realtime.contactsChanged(contact.occupantId);
  return followUp;
};

const getContactFollowUp = async (user, id) => {
  const followUp = await followUpRepository.findContactFollowUp(id, standOf(user));
  if (!followUp) throw new AppError(404, 'FOLLOW_UP_NOT_FOUND', 'Relance introuvable.');
  return followUp;
};

// Relance faite : la prochaine étape (terminée, relancer avec une nouvelle relance, ou autre avec un texte).
const completeContact = async (user, id, { outcome, note = null, next = null }) => {
  const followUp = await getContactFollowUp(user, id);
  if (followUp.doneAt) throw new AppError(409, 'FOLLOW_UP_DONE', 'Cette relance est déjà faite.');
  if (outcome === 'again') assertFuture(next.dueAt);
  await followUpRepository.updateContactFollowUp(followUp, { doneAt: new Date(), outcome, outcomeNote: note || null });
  removedAlert(followUp);
  if (outcome === 'again') {
    const created = await followUpRepository.createContactFollowUp({ contactId: followUp.contactId, dueAt: next.dueAt, reason: next.reason, createdByUserId: user.id });
    scheduled(created, followUp.contact);
  }
  realtime.contactsChanged(followUp.contact.occupantId);
  return followUp;
};

const removeContact = async (user, id) => {
  const followUp = await getContactFollowUp(user, id);
  await followUpRepository.destroyContactFollowUp(followUp);
  removedAlert(followUp);
  realtime.contactsChanged(followUp.contact.occupantId);
};

// Relances B2B : celles des demandes du stand (ou de tous les stands pour l'API-ZF).
const b2bScheduled = (followUp, proposal) => notificationService.b2bFollowUpChanged(followUp, proposal);
const b2bRemoved = (followUp) => notificationService.b2bFollowUpRemoved(followUp);

const listB2b = async (user) => followUpRepository.findB2bFollowUps(standOf(user));

// Ajoutée à la main, ou par la prochaine étape d'un compte rendu (avec une date).
const addB2b = async (user, proposalId, { dueAt, reason }) => {
  const proposal = await followUpRepository.findProposal(proposalId, standOf(user));
  if (!proposal) throw new AppError(404, 'B2B_PROPOSAL_NOT_FOUND', 'Demande B2B introuvable.');
  assertFuture(dueAt);
  const followUp = await followUpRepository.createB2bFollowUp({ b2bProposalId: proposal.id, dueAt, reason, createdByUserId: user.id });
  b2bScheduled(followUp, proposal);
  realtime.b2bChanged(proposal.need.occupantId);
  return followUp;
};

const getB2bFollowUp = async (user, id) => {
  const followUp = await followUpRepository.findB2bFollowUp(id, standOf(user));
  if (!followUp) throw new AppError(404, 'FOLLOW_UP_NOT_FOUND', 'Relance introuvable.');
  return followUp;
};

const completeB2b = async (user, id, { outcome, note = null, next = null }) => {
  const followUp = await getB2bFollowUp(user, id);
  if (followUp.doneAt) throw new AppError(409, 'FOLLOW_UP_DONE', 'Cette relance est déjà faite.');
  if (outcome === 'again') assertFuture(next.dueAt);
  await followUpRepository.updateB2bFollowUp(followUp, { doneAt: new Date(), outcome, outcomeNote: note || null });
  b2bRemoved(followUp);
  if (outcome === 'again') {
    const created = await followUpRepository.createB2bFollowUp({ b2bProposalId: followUp.b2bProposalId, dueAt: next.dueAt, reason: next.reason, createdByUserId: user.id });
    b2bScheduled(created, followUp.proposal);
  }
  realtime.b2bChanged(followUp.proposal.need.occupantId);
  return followUp;
};

const removeB2b = async (user, id) => {
  const followUp = await getB2bFollowUp(user, id);
  await followUpRepository.destroyB2bFollowUp(followUp);
  b2bRemoved(followUp);
  realtime.b2bChanged(followUp.proposal.need.occupantId);
};

module.exports = {
  applyClassFollowUp, listContacts, listGuichets, addContact, completeContact, removeContact,
  listB2b, addB2b, completeB2b, removeB2b, CLASS_SOURCES,
};
