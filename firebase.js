// ── Firebase SDK (CDN – no bundler needed) ──────────────────────────────────
import { initializeApp }              from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAnalytics }               from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs,
  doc,
  updateDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// ── Config ───────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDzHV0OnFIDhPPJ-UOlA9BfqsFu-WW6B7A",
  authDomain:        "finderweb-167f8.firebaseapp.com",
  projectId:         "finderweb-167f8",
  storageBucket:     "finderweb-167f8.firebasestorage.app",
  messagingSenderId: "894725947052",
  appId:             "1:894725947052:web:7b7e83f47bebeb31c8e909",
  measurementId:     "G-3NFPXKMWX5"
};

// ── Init ─────────────────────────────────────────────────────────────────────
const app       = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db        = getFirestore(app);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Guarda una visita en la coleccion "visitas".
 */
export async function saveVisit(payload) {
  try {
    await addDoc(collection(db, "visitas"), {
      ...payload,
      timestamp: serverTimestamp()
    });
  } catch (e) {
    console.warn("[Firebase] No se pudo guardar la visita:", e);
  }
}

/**
 * Registra un usuario nuevo en la coleccion "usuarios" (sin necesidad de compra).
 */
export async function registerAccount(discord, pin) {
  const cleanDiscord = discord.toLowerCase().trim();
  const cleanPin = pin.toString().trim();

  try {
    // Verificar si ya existe en "usuarios"
    const q = query(collection(db, "usuarios"), where("discord", "==", cleanDiscord));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      let existingUser = null;
      snapshot.forEach(docSnap => {
        if (docSnap.data().pin === cleanPin) {
          existingUser = docSnap.data();
        }
      });
      if (existingUser) {
        return { success: true, message: "Cuenta ya registrada. Se inició sesión.", user: existingUser };
      } else {
        throw new Error("El usuario de Discord ya está registrado con otro PIN.");
      }
    }

    // Si no existe, crear la cuenta
    const newUser = {
      discord: cleanDiscord,
      discordOriginal: discord.trim(),
      pin: cleanPin,
      registeredAt: serverTimestamp()
    };

    await addDoc(collection(db, "usuarios"), newUser);
    return { success: true, message: "Cuenta registrada con éxito.", user: newUser };
  } catch (error) {
    if (error.code === 'permission-denied' || error.message.includes('permission')) {
      throw new Error("Permisos insuficientes en Firebase: Debes permitir lectura/escritura en las reglas de Firestore (Firebase Console -> Firestore Database -> Reglas -> allow read, write: if true;).");
    }
    throw error;
  }
}

/**
 * Guarda una compra en la coleccion "compras".
 */
export async function savePurchase(payload, discord, pin, producto = "Producto Digital", metodoPago = "No especificado", detallesPago = {}) {
  try {
    const cleanDiscord = discord.toLowerCase().trim();
    const cleanPin = pin.toString().trim();

    // Tambien nos aseguramos que quede registrado en "usuarios"
    try {
      await registerAccount(discord, pin).catch(() => {});
    } catch(e) {}

    await addDoc(collection(db, "compras"), {
      ...payload,
      discord: cleanDiscord,
      discordOriginal: discord.trim(),
      pin: cleanPin,
      producto,
      metodoPago,
      detallesPago,
      estado: "Pendiente", // Pendiente | Activado | Rechazado
      timestamp: serverTimestamp()
    });
  } catch (e) {
    console.warn("[Firebase] No se pudo guardar la compra:", e);
    throw e;
  }
}

/**
 * Inicia sesión o verifica usuario y obtiene sus pedidos.
 */
export async function loginAndGetOrders(discord, pin) {
  const cleanDiscord = discord.toLowerCase().trim();
  const cleanPin = pin.toString().trim();

  // 1. Buscar en usuarios
  const userQ = query(collection(db, "usuarios"), where("discord", "==", cleanDiscord));
  const userSnap = await getDocs(userQ);

  let isValidUser = false;
  let userDiscordOriginal = discord.trim();

  userSnap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.pin === cleanPin) {
      isValidUser = true;
      if (data.discordOriginal) userDiscordOriginal = data.discordOriginal;
    }
  });

  // 2. Buscar en compras por si registro comprando directamente
  const ordersQ = query(collection(db, "compras"), where("discord", "==", cleanDiscord));
  const ordersSnap = await getDocs(ordersQ);
  const orders = [];

  ordersSnap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.pin === cleanPin) {
      isValidUser = true;
      if (data.discordOriginal) userDiscordOriginal = data.discordOriginal;
      orders.push({
        id: docSnap.id,
        ...data
      });
    }
  });

  if (!isValidUser && userSnap.empty && ordersSnap.empty) {
    throw new Error("NOT_FOUND");
  }

  if (!isValidUser) {
    throw new Error("PIN_INVALID");
  }

  orders.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

  return {
    discordOriginal: userDiscordOriginal,
    orders
  };
}

/**
 * [ADMIN] Obtiene todas las compras registradas.
 */
export async function getAllOrdersAdmin() {
  const q = query(collection(db, "compras"));
  const snapshot = await getDocs(q);
  const orders = [];

  snapshot.forEach((docSnap) => {
    orders.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  // Ordenar de más reciente a más antiguo por timestamp si existe
  orders.sort((a, b) => {
    const tA = a.timestamp?.seconds || 0;
    const tB = b.timestamp?.seconds || 0;
    return tB - tA;
  });

  return orders;
}

/**
 * [ADMIN] Obtiene todos los usuarios registrados.
 */
export async function getAllUsersAdmin() {
  const q = query(collection(db, "usuarios"));
  const snapshot = await getDocs(q);
  const users = [];

  snapshot.forEach((docSnap) => {
    users.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  return users;
}

/**
 * [ADMIN] Obtiene las visitas registradas.
 */
export async function getAllVisitsAdmin() {
  const q = query(collection(db, "visitas"));
  const snapshot = await getDocs(q);
  const visits = [];

  snapshot.forEach((docSnap) => {
    visits.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  return visits;
}

/**
 * [ADMIN] Actualiza el estado de una orden (Pendiente -> Activado / Rechazado).
 */
export async function updateOrderStatusAdmin(orderId, newStatus) {
  const orderRef = doc(db, "compras", orderId);
  await updateDoc(orderRef, {
    estado: newStatus
  });
}

export { app, analytics, db };
