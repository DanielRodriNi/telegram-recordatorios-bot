// Estado en memoria del flujo interactivo de creación de recordatorios, por chat_id.
const states = new Map();

function getState(chatId) {
  return states.get(chatId) || null;
}

function setState(chatId, state) {
  states.set(chatId, state);
}

function clearState(chatId) {
  states.delete(chatId);
}

module.exports = { getState, setState, clearState };
