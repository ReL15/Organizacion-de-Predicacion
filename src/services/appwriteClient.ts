/**
 * Cliente oficial de Appwrite para autenticación y ejecución de Functions
 */

import { Client, Account, Functions, OAuthProvider } from 'appwrite';

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';
export const functionId = import.meta.env.VITE_APPWRITE_FUNCTION_ID || '';

export const isAppwriteConfigured =
  Boolean(projectId) &&
  projectId !== 'tu_project_id_aqui' &&
  !projectId.includes('placeholder');

export const appwriteClient = new Client();

if (isAppwriteConfigured) {
  appwriteClient.setEndpoint(endpoint).setProject(projectId);
}

export const appwriteAccount = new Account(appwriteClient);
export const appwriteFunctions = new Functions(appwriteClient);

export { OAuthProvider };
