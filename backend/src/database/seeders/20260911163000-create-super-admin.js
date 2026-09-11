'use strict';

require('../../config/env');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';

    if (!email || password.length < 8) {
      throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD de 8 caracteres minimum sont requis.');
    }

    const existing = await queryInterface.rawSelect('users', { where: { email } }, ['id']);
    if (existing) {
      return;
    }

    const now = new Date();
    await queryInterface.bulkInsert('users', [
      {
        id: crypto.randomUUID(),
        occupant_id: null,
        first_name: process.env.ADMIN_FIRST_NAME || 'Admin',
        last_name: process.env.ADMIN_LAST_NAME || 'HubInvest',
        email,
        phone: null,
        password_hash: await bcrypt.hash(password, 12),
        role: 'super-admin',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    if (email) {
      await queryInterface.bulkDelete('users', { email });
    }
  },
};
