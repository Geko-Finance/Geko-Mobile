import { relations } from 'drizzle-orm';
import { auditLogs } from './audit';
import { authIdentities, sessions } from './auth';
import { contacts } from './contacts';
import { userDevices } from './devices';
import { notificationPreferences } from './notifications';
import { users } from './users';
import { walletSecrets } from './wallet-secrets';
import {
  custodialWalletDetails,
  nonCustodialWalletDetails,
  wallets,
} from './wallets';

export const usersRelations = relations(users, ({ one, many }) => ({
  authIdentities: many(authIdentities),
  sessions: many(sessions),
  wallets: many(wallets),
  userDevices: many(userDevices),
  contacts: many(contacts),
  auditLogs: many(auditLogs),
  notificationPreferences: one(notificationPreferences),
}));

export const authIdentitiesRelations = relations(authIdentities, ({ one }) => ({
  user: one(users, {
    fields: [authIdentities.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  custodialWalletDetails: one(custodialWalletDetails),
  nonCustodialWalletDetails: one(nonCustodialWalletDetails),
  walletSecrets: many(walletSecrets),
  auditLogs: many(auditLogs),
}));

export const walletSecretsRelations = relations(walletSecrets, ({ one }) => ({
  wallet: one(wallets, {
    fields: [walletSecrets.walletId],
    references: [wallets.id],
  }),
}));

export const custodialWalletDetailsRelations = relations(
  custodialWalletDetails,
  ({ one }) => ({
    wallet: one(wallets, {
      fields: [custodialWalletDetails.walletId],
      references: [wallets.id],
    }),
  }),
);

export const nonCustodialWalletDetailsRelations = relations(
  nonCustodialWalletDetails,
  ({ one }) => ({
    wallet: one(wallets, {
      fields: [nonCustodialWalletDetails.walletId],
      references: [wallets.id],
    }),
  }),
);

export const userDevicesRelations = relations(userDevices, ({ one }) => ({
  user: one(users, {
    fields: [userDevices.userId],
    references: [users.id],
  }),
}));

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationPreferences.userId],
      references: [users.id],
    }),
  }),
);

export const contactsRelations = relations(contacts, ({ one }) => ({
  user: one(users, {
    fields: [contacts.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  wallet: one(wallets, {
    fields: [auditLogs.walletId],
    references: [wallets.id],
  }),
}));
