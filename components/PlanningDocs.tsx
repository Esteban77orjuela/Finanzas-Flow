import React from 'react';

const PlanningDocs: React.FC = () => {
  return (
    <div className="space-y-8 p-4 md:p-8 max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-sm text-slate-800 dark:text-slate-200">
      <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
        <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-500">Documentación del Proyecto</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Planificación técnica, estructura de datos y experiencia de usuario.</p>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-primary-600">1. Modelo de Datos (Diagrama de Entidades)</h2>
        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto font-mono text-sm">
          <ul className="space-y-4">
            <li>
              <strong className="text-emerald-600 dark:text-emerald-400">Transaction (Transacción)</strong>
              <br />
              {`{ id: string, amount: number, type: 'INCOME'|'EXPENSE', date: Date, categoryId: FK, accountId: FK, isRecurring: boolean }`}
            </li>
            <li>
              <strong className="text-emerald-600 dark:text-emerald-400">Category (Categoría)</strong>
              <br />
              {`{ id: string, name: string, type: 'INCOME'|'EXPENSE', icon: string, color: string }`}
            </li>
            <li>
              <strong className="text-emerald-600 dark:text-emerald-400">Account (Cuenta/Billetera)</strong>
              <br />
              {`{ id: string, name: string, type: 'CASH'|'BANK', balance: number }`}
            </li>
            <li>
              <strong className="text-emerald-600 dark:text-emerald-400">RecurrenceRule (Regla Recurrente)</strong>
              <br />
              {`{ id: string, frequency: 'MONTHLY'|'BIWEEKLY', amount: number, categoryId: FK }`}
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-primary-600">2. Mapa de Pantallas (Wireflow)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border dark:border-slate-700 p-4 rounded-lg">
            <h3 className="font-bold mb-2">Dashboard (Home)</h3>
            <ul className="list-disc ml-5 text-sm text-slate-600 dark:text-slate-400">
              <li>Tarjetas de resumen (Balance, Ingresos, Gastos).</li>
              <li>Filtro rápido: Q1, Q2, Mes.</li>
              <li>Gráfico de distribución de gastos.</li>
              <li>Accesos rápidos: "Agregar Transacción".</li>
            </ul>
          </div>
          <div className="border dark:border-slate-700 p-4 rounded-lg">
            <h3 className="font-bold mb-2">Historial</h3>
            <ul className="list-disc ml-5 text-sm text-slate-600 dark:text-slate-400">
              <li>Lista cronológica.</li>
              <li>Agrupación por días.</li>
              <li>Indicadores visuales de Categoría.</li>
              <li>Acciones: Editar / Eliminar.</li>
            </ul>
          </div>
          <div className="border dark:border-slate-700 p-4 rounded-lg">
            <h3 className="font-bold mb-2">Modal Agregar/Editar</h3>
            <ul className="list-disc ml-5 text-sm text-slate-600 dark:text-slate-400">
              <li>Input de Monto (grande y claro).</li>
              <li>Selector Fecha (con lógica Q1/Q2 automática).</li>
              <li>Selector Categoría y Cuenta.</li>
              <li>Toggle "Recurrente".</li>
            </ul>
          </div>
           <div className="border dark:border-slate-700 p-4 rounded-lg">
            <h3 className="font-bold mb-2">Configuración</h3>
            <ul className="list-disc ml-5 text-sm text-slate-600 dark:text-slate-400">
              <li>Gestión de Categorías (CRUD).</li>
              <li>Gestión de Cuentas.</li>
              <li>Tema (Oscuro/Claro).</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-primary-600">3. User Stories (Requisitos)</h2>
        <div className="space-y-3 text-sm">
          <p>✅ <span className="font-bold">Esencial:</span> Como usuario, quiero registrar mis gastos diarios categorizados para saber en qué se va mi dinero.</p>
          <p>✅ <span className="font-bold">Esencial:</span> Como asalariado, quiero ver mis finanzas divididas por quincenas (1-15 y 16-30) para administrar mejor mi sueldo.</p>
          <p>✅ <span className="font-bold">Esencial:</span> Como usuario, quiero marcar gastos fijos (ej. Renta) para que se sugieran automáticamente cada mes.</p>
          <p>🚀 <span className="font-bold">Pro (Futuro):</span> Como usuario avanzado, quiero sincronizar mi cuenta bancaria para evitar el ingreso manual.</p>
          <p>🚀 <span className="font-bold">Pro (Futuro):</span> Como planificador, quiero definir un presupuesto límite para "Comida" y recibir alertas al 80%.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-primary-600">4. Recomendaciones UI/UX</h2>
        <ul className="list-disc ml-5 text-sm space-y-2 text-slate-600 dark:text-slate-400">
          <li><strong>Paleta de Color Semántica:</strong> Verde esmeralda para ingresos (positivo), Rojo rosa para gastos (negativo/alerta), Azul/Gris para neutral.</li>
          <li><strong>Feedback Inmediato:</strong> Al guardar una transacción, mostrar un "toast" o animación sutil.</li>
          <li><strong>Dark Mode:</strong> Utilizar gris pizarra (Slate-900) en lugar de negro puro para reducir fatiga visual.</li>
          <li><strong>Mobile First:</strong> Botones de acción (FAB) en la zona inferior derecha para fácil alcance con el pulgar.</li>
        </ul>
      </section>
    </div>
  );
};

export default PlanningDocs;