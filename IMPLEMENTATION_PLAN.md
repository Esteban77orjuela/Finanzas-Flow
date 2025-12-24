# Plan de Profesionalización de FinanzaFlow

Este documento detalla el análisis del estado actual del proyecto y propone una hoja de ruta para elevar la calidad del código, la arquitectura y la mantenibilidad a estándares profesionales modernos.

## 📊 Estado Actual (Auditoría)

| Aspecto               | Estado Actual                        | Calificación | Riesgos / Observaciones                                                                 |
| :-------------------- | :----------------------------------- | :----------- | :-------------------------------------------------------------------------------------- |
| **Arquitectura**      | Monolítica en `App.tsx`              | ⭐⭐         | Dificulta la escalabilidad y el trabajo en equipo. "Prop Drilling" excesivo.            |
| **Gestión de Estado** | `useState` local + Prop Drilling     | ⭐⭐         | Hace que los componentes sean difíciles de reutilizar y testear.                        |
| **Persistencia**      | `localStorage` manual                | ⭐⭐         | Funcional pero propenso a errores de sincronización. Sin validación de esquema.         |
| **Routing**           | Condicional (`view === 'DASHBOARD'`) | ⭐⭐         | No permite compartir URLs, historial del navegador o lazy loading eficiente.            |
| **Calidad de Código** | Sin Linting/Formatting automático    | ⭐           | Riesgo de inconsistencias de estilo y errores lógicos no detectados.                    |
| **Testing**           | Inexistente                          | ⭐           | Alto riesgo de regresiones (bugs que vuelven) al modificar código.                      |
| **UI/UX**             | Tailwind CSS custom                  | ⭐⭐⭐⭐     | Buen uso de Tailwind, aunque faltan abstracciones de componentes base (Buttons, cards). |

---

## 🚀 Hoja de Ruta de Mejoras (Roadmap)

### Fase 1: Calidad y Estandarización (Cimientos)

Antes de mover código, debemos asegurar que el entorno nos ayude.

#### 1.1 Tooling

- [ ] **ESLint + Prettier**: Configurar reglas estrictas para TypeScript y React.
  - _Beneficio_: Código consistente automáticamente y prevención de errores comunes.
  - _Comandos_:
    ```bash
    npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
    npm install -D prettier eslint-config-prettier eslint-plugin-prettier
    npm install -D eslint-plugin-react eslint-plugin-react-hooks
    ```
  - _Archivos a crear_: `.eslintrc.json`, `.prettierrc`

- [ ] **Husky + Lint-Staged**: Ejecutar linters antes de cada commit.
  - _Beneficio_: Impide que llegue "código sucio" al repositorio.
  - _Comandos_:
    ```bash
    npm install -D husky lint-staged
    npx husky init
    ```

- [ ] **Absolute Imports**: Configurar `@/components`, `@/utils` en lugar de `../../`.
  - Actualizar `tsconfig.json` y `vite.config.ts`

#### 1.2 Testing (Red de Seguridad)

- [ ] **Vitest + React Testing Library**: Instalar framework de pruebas compatible con Vite.
  - _Comandos_:
    ```bash
    npm install -D vitest @testing-library/react @testing-library/jest-dom
    npm install -D @testing-library/user-event jsdom
    ```
  - _Archivo a crear_: `vitest.config.ts`

- [ ] **Tests Unitarios**: Crear tests para `utils.ts` (crítico para la lógica de recurrencia).
  - Archivo: `utils.test.ts`
  - Casos clave:
    - `generateMissingRecurringTransactions` con diferentes frecuencias
    - `filterTransactions` con quincenas
    - `calculateTotals` con transacciones mixtas

- [ ] **Tests de Integración**: Testear el flujo de "Crear Transacción".
  - Archivo: `TransactionForm.test.tsx`
  - Verificar que se guarda correctamente en el estado

### Fase 2: Arquitectura y Navegación

#### 2.1 React Router DOM

Migrar del renderizado condicional a un enrutador real.

- _Beneficio_: URLs reales (`/dashboard`, `/transactions`), soporte para botón "Atrás", y Code Splitting (cargar solo lo necesario).
- _Comando_:
  ```bash
  npm install react-router-dom
  ```
- _Cambios_:
  - Crear `src/routes.tsx`
  - Envolver `App.tsx` con `<BrowserRouter>`
  - Reemplazar condicionales por `<Route>` components

#### 2.2 Reestructuración de Directorios (Feature-First)

Mover de una carpeta plana `components` a una basada en dominios:

```text
src/
  features/
    transactions/
      components/
        TransactionForm.tsx
        TransactionList.tsx
      hooks/
        useTransactions.ts
      types.ts
    dashboard/
      components/
        Dashboard.tsx
      hooks/
    settings/
      components/
        CategorySettings.tsx
  components/  (UI compartida)
    ui/
      Button.tsx
      Card.tsx
      Modal.tsx
      Input.tsx
  hooks/       (hooks globales)
    useLocalStorage.ts
  lib/         (configuraciones de terceros)
    utils.ts
  types/       (tipos globales)
    index.ts
```

### Fase 3: Gestión de Estado Profesional

#### 3.1 Migración a Zustand

Eliminar el paso de `transactions` y `setTransactions` por todo el árbol de componentes.

- **Recomendación**: **Zustand** por ser ligero, moderno y requerir menos boilerplate que Redux, ideal para este tamaño de app.
- _Comando_:
  ```bash
  npm install zustand
  ```
- _Beneficio_: Componentes más limpios que solo piden los datos que necesitan.
- _Archivo a crear_: `src/store/useFinanceStore.ts`
- _Ejemplo de estructura_:
  ```typescript
  interface FinanceStore {
    transactions: Transaction[];
    categories: Category[];
    addTransaction: (t: Transaction) => void;
    deleteTransaction: (id: string) => void;
    // ... más acciones
  }
  ```

#### 3.2 Capa de Servicios (Abstracción de Datos)

Crear un archivo `services/storage.service.ts` o `hooks/useTransactions.ts`.

- Separar la lógica de _guardar en localStorage_ de la lógica de _la vista_.
- Preparar el terreno para conectar una Base de Datos real (Supabase/Firebase) en el futuro sin romper la UI.
- _Archivo a crear_: `src/services/storage.service.ts`
- _Funciones_:
  ```typescript
  export const StorageService = {
    saveTransactions: (transactions: Transaction[]) => void;
    loadTransactions: () => Transaction[];
    // Con validación Zod integrada
  }
  ```

### Fase 4: Refactorización de Componentes

#### 4.1 Desacoplar TransactionForm

El archivo actual es muy grande (24KB).

- Usar **React Hook Form** + **Zod**: Para validación de formularios profesional y manejo de errores.
- _Comandos_:
  ```bash
  npm install react-hook-form zod @hookform/resolvers
  ```
- Dividir en sub-componentes:
  - `AmountInput.tsx`
  - `CategorySelect.tsx`
  - `RecurrenceOptions.tsx`
  - `DatePicker.tsx`

#### 4.2 Sistema de Diseño (UI Kit)

Crear componentes base reutilizables para evitar repetir clases de Tailwind:

- `<Button variant="primary" | "secondary" | "danger" />`
- `<Card />`
- `<Input />`
- `<Select />`
- `<Modal />`

_Beneficio_: Cambiar el diseño de todos los botones editando un solo archivo.

---

## 💡 Recomendaciones Adicionales

### 1. Validación de Datos (Zod)

Implementar esquemas de validación para los datos que se leen de `localStorage`. Si el formato cambia en una actualización, la app no debería romperse.

```typescript
import { z } from 'zod';

const TransactionSchema = z.object({
  id: z.string(),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  // ... más campos
});
```

### 2. Accesibilidad (a11y)

- Asegurar que todos los inputs tengan labels
- Los colores tengan contraste suficiente (usar herramientas como [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/))
- La navegación por teclado funcione (especialmente en los modales)
- Agregar `aria-label` a botones con solo iconos

### 3. Performance

- Usar `React.memo` o `useMemo` solo donde sea necesario tras perfilar
- Implementar virtualización (`react-window`) si la lista de transacciones crece a miles
- Lazy loading de rutas con `React.lazy` y `Suspense`

### 4. Documentación

- [ ] Crear `CONTRIBUTING.md` con guías para contribuir
- [ ] Documentar componentes complejos con JSDoc
- [ ] Crear Storybook para el sistema de diseño (opcional pero profesional)

### 5. CI/CD

- [ ] Configurar GitHub Actions para:
  - Ejecutar tests en cada PR
  - Ejecutar linters
  - Build automático
  - Deploy a Vercel/Netlify

### 6. Seguridad

- [ ] Nunca guardar información sensible en localStorage sin encriptar
- [ ] Implementar Content Security Policy (CSP)
- [ ] Sanitizar inputs del usuario

---

## 🏁 Pasos Inmediatos Sugeridos (Para empezar ahora)

### Prioridad Alta (Semana 1)

1.  ✅ Instalar y configurar **ESLint** y **Prettier**
2.  ✅ Instalar **Vitest** y escribir test para `generateMissingRecurringTransactions`
3.  ✅ Refactorizar la estructura de carpetas (separar `ui` de `features`)

### Prioridad Media (Semana 2-3)

4.  Implementar **Zustand** para gestión de estado
5.  Migrar a **React Router DOM**
6.  Crear componentes base del sistema de diseño

### Prioridad Baja (Mes 1-2)

7.  Refactorizar `TransactionForm` con React Hook Form
8.  Implementar validación con Zod
9.  Configurar CI/CD

---

## 📚 Recursos de Aprendizaje

- **Clean Code en React**: [Patterns.dev](https://www.patterns.dev/)
- **Testing**: [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- **Zustand**: [Zustand GitHub](https://github.com/pmndrs/zustand)
- **React Router**: [React Router Docs](https://reactrouter.com/)
- **Accesibilidad**: [React Accessibility Guide](https://react.dev/learn/accessibility)

---

## 🎯 Métricas de Éxito

Al completar este plan, tu proyecto tendrá:

- ✅ **0 errores de linting** en cada commit
- ✅ **>80% de cobertura de tests** en lógica crítica
- ✅ **Componentes reutilizables** que reducen código duplicado en 40%
- ✅ **Tiempo de carga inicial** <2 segundos (con code splitting)
- ✅ **Arquitectura escalable** lista para crecer a 50+ componentes

---

**Creado**: 2025-12-24  
**Versión**: 1.0  
**Autor**: Análisis de FinanzaFlow
