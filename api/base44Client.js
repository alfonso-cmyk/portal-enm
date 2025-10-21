import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68f29d820067d1a955b1f570", 
  requiresAuth: true // Ensure authentication is required for all operations
});
