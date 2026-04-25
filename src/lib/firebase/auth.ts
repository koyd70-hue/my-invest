import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getAuthInstance } from './config';

const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  return signInWithPopup(getAuthInstance(), provider);
}

export async function signOut() {
  return firebaseSignOut(getAuthInstance());
}
