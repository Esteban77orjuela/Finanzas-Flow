const REQUIRED_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export function validateEnv(): { ok: boolean; missing: string[] } {
  const missing = REQUIRED_VARS.filter((name) => !import.meta.env[name]);
  return { ok: missing.length === 0, missing };
}

export function getEnvStatus() {
  const vars = import.meta.env;
  return REQUIRED_VARS.map((name) => ({
    name,
    present: !!vars[name],
    preview: vars[name] ? vars[name].slice(0, 12) + '...' : '',
  }));
}
