# SDLC Framework — FinanzaFlow

Estructura profesional de desarrollo de software (Software Development Life Cycle).
Referencia para mantener la visión de arquitecto en cada fase del proyecto.

---

## Fase 0 — Visión del Producto
Antes de escribir código.
- **Problema**: Control de finanzas personales caótico, sin automatización.
- **Usuario**: Persona individual que quiere registrar ingresos/gastos, ver metas y deudas.
- **Objetivo**: App web PWA que permita llevar las finanzas personales de forma simple, visual y automatizada.
- **Valor**: Automatización de ingresos/gastos recurrentes, insights visuales, metas, deudas.
- **Monetización**: Gratuito (proyecto personal/portfolio).
- **Riesgos**: Dependencia de Firebase, API keys expuestas, escalabilidad.

## Fase 1 — Requerimientos
- **Funcionales**: Auth, CRUD transacciones, categorías, cuentas, recurrencias, metas, deudas, dashboard, IA asistente, emojis automáticos.
- **No funcionales**: Responsive (mobile-first), offline-ready (PWA en futuro), <200ms respuesta, dark mode, accesibilidad.
- **Seguridad**: Firebase Auth, reglas de Firestore, API key en entorno, .env en .gitignore.

## Fase 2 — Arquitectura
- **Tipo**: SPA monolítica (React + Vite).
- **Backend**: Firebase (Auth + Firestore) — serverless.
- **Principios**: DRY, KISS, Separation of Concerns.
- **Diagramas**: (pendiente C4 Model).

## Fase 3 — Diseño Técnico
- Estructura de carpetas plana (raíz + components/).
- Patrones: Provider pattern (Firebase context), repositorio (Firestore queries en App.tsx).

## Fase 4 — Desarrollo
- React 19 + TypeScript 5.8 + Tailwind CSS 3.4.
- ESLint + Prettier + Husky + lint-staged.
- Groq AI para emojis y asistente.

## Fase 5 — Base de Datos
- Firestore (NoSQL document store).
- Colecciones: transactions, categories, accounts, recurrence_rules.

## Fase 6 — Testing
- **Pendiente**: Jest + React Testing Library (unit).
- **Pendiente**: Cypress/Playwright (E2E).

## Fase 7 — Ciberseguridad (DevSecOps)
- Firebase Auth (email/password).
- Firestore Security Rules (pendiente hardening).
- API key en .env.local (VITE_GROQ_API_KEY).

## Fase 8 — Docker y Containers
- **Pendiente**: Dockerfile + docker-compose para entorno reproducible.

## Fase 9 — CI/CD
- **Actual**: Vercel auto-deploy desde GitHub (main branch).
- **Pendiente**: GitHub Actions para tests + lint + security scan.

## Fase 10 — Cloud
- **Actual**: Firebase (Auth + Firestore), Vercel (hosting).

## Fase 11 — Observabilidad
- **Pendiente**: Logs, métricas, errores (Sentry, Grafana).

## Fase 12 — Escalabilidad
- **Pendiente**: Caching, lazy loading, code splitting.

## Fase 13 — Mantenimiento y Evolución
- Refactoring continuo.
- Technical Debt tracking.
- Feature Flags (pendiente).
