// Sincronização com o Firebase: guarda uma cópia dos dados na nuvem e mantém
// celular e computador iguais. Os dados continuam salvos no aparelho (app.js),
// então o app funciona sem internet e envia as mudanças quando a conexão voltar.
//
// Cada conta Google tem um documento em users/{uid} com todos os dados em JSON.
// Em caso de conflito, vale a versão salva por último (`updatedAt`).

const FIREBASE_VERSION = '10.12.2';
const PENDING_KEY = 'minhas-tarefas:pending'; // há mudanças locais ainda não enviadas
const SYNCED_KEY = 'minhas-tarefas:synced-uid'; // conta que já sincronizou neste aparelho

const cloud = (window.cloud = {
  configured: Boolean(window.FIREBASE_CONFIG),
  state: 'off', // off | signed-out | saving | synced | offline | error
  user: null,
  lastSync: null,
  signIn: async () => {},
  signOut: async () => {},
});

function setState(state) {
  cloud.state = state;
  window.dispatchEvent(new Event('cloud-status'));
}

const isPending = () => localStorage.getItem(PENDING_KEY) === '1';
const setPending = (on) => (on ? localStorage.setItem(PENDING_KEY, '1') : localStorage.removeItem(PENDING_KEY));

// Mudanças feitas antes de entrar na conta também precisam subir depois.
window.addEventListener('db-saved', () => setPending(true));

if (cloud.configured) {
  start().catch((err) => {
    console.warn('Firebase', err);
    setState('error');
  });
}

async function start() {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  const [{ initializeApp }, fa, fs] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);

  const app = initializeApp(window.FIREBASE_CONFIG);
  const auth = fa.getAuth(app);
  const store = fs.getFirestore(app);
  const provider = new fa.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  cloud.signIn = async () => {
    try {
      await fa.signInWithPopup(auth, provider);
    } catch (err) {
      // Alguns navegadores bloqueiam a janela de login; aí abre na mesma aba.
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
        await fa.signInWithRedirect(auth, provider);
      } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        throw err;
      }
    }
  };
  cloud.signOut = () => fa.signOut(auth);

  let ref = null;
  let unsubscribe = null;
  let timer = null;

  const markSynced = () => {
    cloud.lastSync = new Date();
    setState('synced');
  };

  async function push() {
    if (!ref) return;
    setState(navigator.onLine ? 'saving' : 'offline');
    try {
      // Só resolve quando o servidor confirma, então dá pra limpar a pendência com segurança.
      await fs.setDoc(ref, { data: JSON.stringify(db), updatedAt: db.updatedAt || Date.now() });
      setPending(false);
      markSynced();
    } catch (err) {
      console.warn('Firebase', err);
      setState(navigator.onLine ? 'error' : 'offline');
    }
  }

  window.addEventListener('db-saved', () => {
    if (!ref) return;
    clearTimeout(timer);
    timer = setTimeout(push, 800);
  });
  window.addEventListener('online', () => {
    if (ref && isPending()) push();
  });

  // Decide, ao entrar, se os dados da nuvem substituem os deste aparelho.
  function takeRemote(remote, firstTimeHere) {
    const onlySeed = !db.tasks.length && !db.topics.length && !db.exams.length;
    if (onlySeed) return true;
    if (firstTimeHere) {
      return confirm(
        'Este aparelho tem dados que ainda não estão na sua conta, e a conta já tem dados salvos.\n\n' +
        'OK: usar os dados da conta neste aparelho.\n' +
        'Cancelar: enviar os dados deste aparelho para a conta.'
      );
    }
    if (!isPending()) return true;
    return (remote.updatedAt || 0) > (db.updatedAt || 0);
  }

  fa.onAuthStateChanged(auth, async (user) => {
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
    ref = null;
    cloud.user = user;
    if (!user) {
      setState('signed-out');
      return;
    }

    ref = fs.doc(store, 'users', user.uid);
    setState('saving');
    try {
      const snap = await fs.getDoc(ref);
      const firstTimeHere = localStorage.getItem(SYNCED_KEY) !== user.uid;
      if (snap.exists() && takeRemote(snap.data(), firstTimeHere)) {
        replaceDb(JSON.parse(snap.data().data));
        setPending(false);
        markSynced();
      } else {
        await push();
      }
      localStorage.setItem(SYNCED_KEY, user.uid);
    } catch (err) {
      console.warn('Firebase', err);
      setState(navigator.onLine ? 'error' : 'offline');
    }

    // Mudanças feitas em outro aparelho chegam aqui em tempo real.
    unsubscribe = fs.onSnapshot(ref, (snap) => {
      if (!snap.exists() || snap.metadata.hasPendingWrites || isPending()) return;
      const remote = snap.data();
      if ((remote.updatedAt || 0) > (db.updatedAt || 0)) {
        replaceDb(JSON.parse(remote.data));
        markSynced();
      }
    });
  });
}
