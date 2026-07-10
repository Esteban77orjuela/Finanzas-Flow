# Arquitectura de FinanzaFlow

## Idea General (para el jefe/cliente)

> **FinanzaFlow** es una aplicación web progresiva (PWA) de finanzas personales.
> El usuario llega, inicia sesión con su correo (Firebase Auth) y puede registrar
> ingresos y gastos, categorizarlos automáticamente con emojis via IA, crear reglas
> de recurrencia mensual, definir metas de ahorro y controlar deudas.
> Todo se sincroniza en tiempo real con Firestore. La app es responsiva (mobile-first)
> con navegación inferior en celular y sidebar en desktop.

---

## Stack Tecnológico

| Capa          | Tecnología                    |
|---------------|-------------------------------|
| Frontend      | React 19 + TypeScript 5.8     |
| Estilos       | Tailwind CSS 3.4              |
| Build         | Vite 6                        |
| Base de Datos | Firestore (NoSQL)             |
| Auth          | Firebase Auth (email/password)|
| IA            | Groq API (llama-3.3-70b)      |
| Hosting       | Vercel                        |
| Linting       | ESLint + Prettier + Husky     |

---

## Estructura de Carpetas

```
/
├── App.tsx                    ← Componente principal (orquestador)
├── types.ts                   ← Interfaces y tipos (Transaction, Category, Account, Goal, Debt...)
├── utils.ts                   ← Funciones puras (formateo, filtros, recurrencias, Groq)
├── firebaseClient.ts          ← Inicialización de Firebase
├── index.tsx                  ← Entry point
├── index.css                  ← Tailwind base + estilos globales
├── .env.local                 ← Variables de entorno (API keys)
├── .gitignore                 ← Ignora .env, node_modules, dist
├── tailwind.config.js         ← Config de Tailwind (colores, animaciones)
├── vite.config.ts             ← Config de Vite (alias, server, vars)
├── tsconfig.json              ← Config de TypeScript
├── package.json               ← Dependencias y scripts
├── components/                ← Componentes React
│   ├── AuthPage.tsx           ← Login/registro/recuperación
│   ├── Dashboard.tsx          ← Resumen: balance, ingresos, gastos, gráfica
│   ├── TransactionForm.tsx    ← Modal para crear/editar transacciones
│   ├── TransactionList.tsx    ← Lista de transacciones del mes
│   ├── QuickActionPanel.tsx   ← Accesos rápidos (ingreso, gasto, IA, categoría)
│   ├── CategorySettings.tsx   ← CRUD de categorías
│   ├── CategoryFormModal.tsx  ← Modal para nueva categoría
│   ├── GoalsView.tsx          ← Vista de metas con anillos de progreso
│   ├── GoalFormModal.tsx      ← Modal para crear/editar meta
│   ├── DebtsView.tsx          ← Vista de deudas con barras de progreso
│   ├── DebtFormModal.tsx      ← Modal para crear/editar deuda
│   ├── AIAssistantModal.tsx   ← Asistente IA con Groq (procesa lenguaje natural)
│   ├── FloatingCalculator.tsx ← Calculadora flotante
│   ├── ConfirmationModal.tsx  ← Modal de confirmación (eliminar)
│   ├── RecurringDeleteModal.tsx ← Modal para eliminar recurrencias
│   └── PlanningDocs.tsx       ← Documentación de planificación
├── docs/                      ← Documentación del proyecto
│   ├── SDLC_FRAMEWORK.md
│   ├── ARQUITECTURA.md        ← Este archivo
│   └── BITACORA.md
└── dist/                      ← Build de producción (generado)
```

---

## Flujo de Datos (Idea Particular)

1. **Auth**: `Firebase Auth` → `onAuthStateChanged` → sesión en `App.tsx`
2. **Datos**: `Firestore` → `getDocs` en `useEffect` inicial → estados locales (`transactions`, `categories`, etc.)
3. **Escritura**: Formularios → `handleSaveTransaction` / `handleAddCategory` → actualiza estado local + `setDoc` a Firestore
4. **Recurrencias**: `useEffect` escucha cambios en reglas → `generateMissingRecurringTransactions` → nuevas transacciones
5. **IA**: `Groq API` → `AIAssistantModal` envía prompt → recibe acciones → `handleAIExecute` las ejecuta
6. **Emojis**: `getCategoryEmojiFromGroq` → se llama al crear categoría o al guardar transacción si falta icono

---

## Interfaces Clave (`types.ts`)

```typescript
Transaction  { id, amount, type, date, categoryId, accountId, note, isRecurring, recurrenceRuleId }
Category     { id, name, type, color, icon? }
Account      { id, name, type, balance }
Goal         { id, name, targetAmount, currentAmount, targetDate, color, icon?, createdAt }
Debt         { id, name, totalAmount, paidAmount, dueDate?, notes?, color, createdAt }
RecurrenceRule { id, frequency, startDate, endDate?, amount, type, categoryId, accountId, note, baseDateDay }
```

---

## Variables de Entorno (`.env.local`)

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GROQ_API_KEY=
```
