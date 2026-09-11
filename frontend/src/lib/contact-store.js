import Dexie from 'dexie';

const database = new Dexie('hubinvest-contacts');

database.version(1).stores({
  contacts: '&id, occupantId, syncStatus, createdAt',
});

const toApiPayload = (contact) => ({
  id: contact.id,
  fullName: contact.fullName,
  phone: contact.phone,
  company: contact.company || null,
  need: contact.need || null,
  qualification: contact.qualification,
  nextAction: contact.nextAction || null,
  nextActionAt: contact.nextActionAt || null,
  consentOccupant: contact.consentOccupant,
  consentApizf: contact.consentApizf,
});

export const listStoredContacts = async (occupantId) => {
  const contacts = await database.contacts.where('occupantId').equals(occupantId).toArray();
  return contacts.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
};

export const queueContact = async (occupantId, values) => {
  const now = new Date().toISOString();
  const contact = {
    ...values,
    occupantId,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
    syncError: null,
  };
  await database.contacts.put(contact);
  return contact;
};

export const mergeServerContacts = async (occupantId, contacts) => {
  await database.transaction('rw', database.contacts, async () => {
    for (const contact of contacts) {
      await database.contacts.put({
        ...contact,
        occupantId,
        syncStatus: 'synced',
        syncError: null,
      });
    }
  });
};

export const syncPendingContacts = async (occupantId, send) => {
  const pending = await database.contacts
    .where('occupantId')
    .equals(occupantId)
    .filter((contact) => contact.syncStatus !== 'synced')
    .toArray();

  for (const contact of pending) {
    await database.contacts.update(contact.id, { syncStatus: 'syncing', syncError: null });
    try {
      const result = await send(toApiPayload(contact));
      const saved = result.contact || contact;
      await database.contacts.put({
        ...contact,
        ...saved,
        occupantId,
        syncStatus: 'synced',
        syncError: null,
      });
    } catch (error) {
      await database.contacts.update(contact.id, {
        syncStatus: 'pending',
        syncError: error.message,
      });
      throw error;
    }
  }
};
