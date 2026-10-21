/* Mini barramento de eventos: permite que a lógica avise a interface sem importá-la.
   Eventos usados: 'inventory:changed' e 'pets:changed'. */

const listeners = {};

export const on = (name, fn) => (listeners[name] || (listeners[name] = [])).push(fn);

export const emit = name => (listeners[name] || []).forEach(fn => fn());
