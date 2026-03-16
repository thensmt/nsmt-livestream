import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Same Firebase project as nsmt-stats.html (sincere-nirvana-436014-v9)
const firebaseConfig = {
  apiKey:            'AIzaSyD_ObMxqLz2LiuDiU4TWDT7G5FtWDeK_sI',
  authDomain:        'sincere-nirvana-436014-v9.firebaseapp.com',
  projectId:         'sincere-nirvana-436014-v9',
  storageBucket:     'sincere-nirvana-436014-v9.firebasestorage.app',
  messagingSenderId: '417098775531',
  appId:             '1:417098775531:web:d1d88da74d217ecbd5f7ae',
  measurementId:     'G-4HRSMQ0X13',
};

export const app      = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const provider = new GoogleAuthProvider();
