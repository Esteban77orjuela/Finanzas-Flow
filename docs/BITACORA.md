# Bitácora de Desarrollo — FinanzaFlow

Registro de cambios, decisiones y estado del proyecto.

---

## [2026-07-10] Sprint 1 — Testing (Fase 6) completado

### Cambios realizados
- Instalación de Vitest + React Testing Library + jsdom + Playwright
- `vitest.config.ts`: configuración de testing (jsdom, setup)
- `test/setup.ts`: setup con jest-dom matchers
- `test/utils.test.ts`: 24 tests para utilerías (formatCurrency, roundToTwo, filterTransactions, calculateTotals, generateId, generateMissingRecurringTransactions, getCategoryEmojiFromGroq)
- `test/components/Dashboard.test.tsx`: 3 tests para Dashboard (renderiza categorías, muestra resumen, estado vacío)
- `test/components/TransactionList.test.tsx`: 3 tests para TransactionList (renderiza transacciones, emojis, vacío)
- `.github/workflows/ci.yml`: GitHub Actions — corre tsc + lint + test + build en cada push
- `package.json`: scripts test, test:watch, test:ui
- `vite.config.ts`: limpiado (eliminadas referencias a GEMINI_API_KEY)
- `docs/ARQUITECTURA.md`: documentación de arquitectura creada
- `docs/SDLC_FRAMEWORK.md`: framework SDLC guardado como referencia
- `docs/BITACORA.md`: este archivo

### Resultados
- ✅ 30 tests unitarios y de componentes
- ✅ GitHub Actions pipeline configurado
- ✅ Build compila sin errores
- ✅ TypeScript type-checks sin errores

## [2026-07-10] Sprint 4 — Docker (Fase 8)

### Cambios realizados
- `Dockerfile`: multi-stage build (Node 22 builder + nginx alpine production), build args para VITE_* env vars
- `docker-compose.yml`: orquestación, pasa env vars como build args, expone puerto 3000
- `nginx.conf`: SPA routing, caché de assets, gzip
- `.dockerignore`: excluye node_modules, dist, .env, docs, test

### Cómo usar
```bash
# Construir imagen
docker compose build

# Iniciar contenedor
docker compose up -d
# Abrir http://localhost:3000

# Detener
docker compose down
```

### Resultados
- ✅ TypeScript: 0 errores
- ✅ Tests: 30 pasan
- ✅ Build: exitoso

### Cambios realizados
- `firestore.rules`: reglas de seguridad para todas las colecciones (solo propietario puede leer/escribir)
- `firestore.indexes.json`: índices compuestos para consultas por user_id + fecha/tipo
- `envCheck.ts`: validación de variables de entorno al arrancar la app
- `firebaseClient.ts`: integra validación de entorno con errores en consola
- `docs/SEGURIDAD.md`: documentación de seguridad + guía de despliegue

### Resultados
- ✅ TypeScript: 0 errores
- ✅ Tests: 30 pasan
- ✅ Build: exitoso

### Cambios realizados
- `components/ErrorBoundary.tsx`: captura errores de React, muestra pantalla de error con botones Reintentar/Recargar
- `components/Skeleton.tsx`: 4 componentes de skeleton (CardSkeleton, RowSkeleton, SectionSkeleton, DashboardSkeleton) con animación pulse
- `index.tsx`: envuelve App con ErrorBoundary + registra Service Worker
- `index.html`: meta tags PWA, manifest link, icono, viewport-fit=cover
- `public/manifest.json`: PWA manifest (nombre, iconos, tema, standalone)
- `public/sw.js`: Service Worker con cache-first strategy
- `public/icon-192.svg`, `public/icon-512.svg`: iconos PWA
- `App.tsx`: loading state ahora muestra sidebar skeleton + DashboardSkeleton
- `tsconfig.json`: limpiado (eliminado experimentalDecorators obsoleto)
- `types.ts`: Account.color añadido
- `DebtsView.tsx`: title→aria-label en iconos lucide

### Resultados
- ✅ TypeScript: 0 errores
- ✅ Tests: 30 pasan
- ✅ Build: exitoso
- ✅ PWA instalable (manifest + SW)
- ✅ Error boundary funcional
- ✅ Loading skeletons profesionales

### Commits en `main`

| Hash      | Descripción                                                                |
|-----------|----------------------------------------------------------------------------|
| `fd892bb` | feat: emojis con Groq via env var, numero responsivo, sync masivo de emojis |
| `8977419` | feat: sidebar con Metas, Deudas, nueva navegacion                          |
| `9451b73` | refactor: eliminar quincenas, dejar solo mes completo                      |
| `d08baaf` | fix: edicion recurrente, error quincena_n undefined, orden A-Z/Fecha       |
| `dacd457` | fix: edicion recurrente y error quincena_n undefined                       |
| `53ca2be` | Migración definitiva a Firebase                                            |
| `6a8bd21` | feat: implementar flujo de recuperación de contraseña con Supabase         |
| `680ba81` | UI: Mostrar perfil de usuario en header y nueva tarjeta de perfil en Ajustes |
| `173456e` | UI: Nueva barra de navegación premium con FAB central y calculadora        |
| `87770f9` | Fix: Overflow de números grandes en móvil con formato compacto             |
| `673be7a` | Refactor: Mejoras de responsividad y blindaje técnico                      |
| `990185e` | Refactor: Seguridad Supabase y diseño responsive corrigiendo lints         |
| `812232a` | Implementar Asistente IA con Groq y mejoras de seguridad de datos          |

### Lo que funciona hoy
- [x] Login/registro con Firebase Auth (email + contraseña)
- [x] Recuperación de contraseña
- [x] Dashboard con balance, ingresos vs gastos, gráfica mensual
- [x] CRUD de transacciones (ingreso/gasto)
- [x] CRUD de categorías (con emoji automático via Groq)
- [x] Transacciones recurrentes (mensuales)
- [x] Metas de ahorro (con anillo de progreso)
- [x] Deudas (con barra de progreso y fecha límite)
- [x] Asistente IA con Groq (lenguaje natural → transacciones)
- [x] Sidebar desktop + bottom nav mobile
- [x] Dark mode
- [x] Formato de moneda responsivo (compacto en mobile)
- [x] Sincronización con Firestore en tiempo real
- [x] Calculadora flotante
- [x] Husky + lint-staged + Prettier

### Lo que falta (próximos sprints)
- [ ] Testing unitario (Jest + RTL)
- [ ] Testing E2E (Playwright)
- [ ] GitHub Actions (CI/CD)
- [ ] Dockerfile + docker-compose
- [ ] PWA (service worker, offline)
- [ ] Exportar datos (CSV/PDF)
- [ ] Presupuestos mensuales por categoría
- [ ] Búsqueda y filtros avanzados
- [ ] Paginación de transacciones
- [ ] Firestore Security Rules hardening
- [ ] Error boundaries en React
- [ ] Loading skeletons
- [ ] Multi-currency
- [ ] Notificaciones de deudas próximas a vencer
- [ ] Role-based access (admin vs user)

---

## Decisiones de Arquitectura

1. **Firestore en vez de SQL**: Por ser serverless, tiempo real, integración nativa con Firebase Auth.
2. **Groq en vez de Gemini/OpenAI**: Más rápido, más barato (gratis), buena calidad para tareas simples.
3. **Vite en vez de CRA**: Más rápido, moderno, mejor DX.
4. **Tailwind en vez de CSS modules**: Más rápido de prototipar, consistente.
5. **Luna-3.3-70b**: Modelo de Groq para tareas estructura (JSON) y emojis.
6. **Variable de entorno para API key**: Evita exponer claves en GitHub.
7. **`.env.local` en `.gitignore`**: Seguridad por defecto.

---

## Comandos Útiles

```bash
npm run dev        # Inicia servidor local en puerto 3000
npm run build      # Compila para producción
npm run preview    # Previsualiza build local
npm run lint       # Ejecuta ESLint
npm run lint:fix   # Corrige errores automáticamente
npm run format     # Formatea código con Prettier
npx tsc --noEmit   # Type-check sin emitir archivos
```
