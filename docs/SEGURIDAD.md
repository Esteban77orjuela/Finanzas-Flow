# Seguridad en FinanzaFlow (Fase 7 — DevSecOps)

## Firestore Security Rules

Reglas implementadas en `firestore.rules`:

- **Autenticación obligatoria** para cualquier operación
- **Aislamiento por usuario**: cada usuario solo lee/escribe sus propios documentos (`user_id`)
- **Protección en escritura**: el `user_id` no puede cambiarse en updates
- **Denegar todo lo demás** por defecto

Colecciones protegidas:
- `transactions`, `categories`, `accounts`, `recurrence_rules`, `goals`, `debts`

### Cómo desplegar las reglas

```bash
npx firebase-tools deploy --only firestore:rules
```

## Variables de Entorno

Todas las API keys y config sensibles están en `.env.local` (ignorado por Git).
Validadas al iniciar la app via `envCheck.ts`.

### Requeridas
| Variable | Propósito |
|----------|-----------|
| VITE_FIREBASE_API_KEY | API key de Firebase |
| VITE_FIREBASE_AUTH_DOMAIN | Dominio de autenticación |
| VITE_FIREBASE_PROJECT_ID | ID del proyecto Firebase |
| VITE_FIREBASE_STORAGE_BUCKET | Bucket de Storage |
| VITE_FIREBASE_MESSAGING_SENDER_ID | Sender ID |
| VITE_FIREBASE_APP_ID | App ID |

### Opcionales
| Variable | Propósito |
|----------|-----------|
| VITE_GROQ_API_KEY | API key de Groq (IA) |

## Buenas Prácticas Aplicadas

- [x] `.env.local` en `.gitignore`
- [x] Sin secrets hardcodeados en el código
- [x] Validación de entorno al startup
- [x] Firestore Rules por usuario
- [x] Dependencia mínima (solo Firebase para auth+db)
- [x] TypeScript strict validations
- [x] Linter (ESLint) con reglas de seguridad
