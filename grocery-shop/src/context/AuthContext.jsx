import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

async function loadProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // {username, email, role}
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (u) {
        const p = await loadProfile(u.uid);
        if (p?.banned) {
        // баннат → logout
        await signOut(auth);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
        }
        setProfile(p);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  // ✅ Регистрация + запис на профил + email verification
  const register = async (email, password, username) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(cred.user, { displayName: username });

    const data = {
      username,
      email,
      role: "user",
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", cred.user.uid), data);
    setProfile(data);

    // ✅ изпрати verification
    await sendEmailVerification(cred.user);

    return cred.user;
  };
const login = async (email, password) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);

  if (!cred.user.emailVerified) {
    await sendEmailVerification(cred.user); // по желание
    await signOut(auth);
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  return cred.user;
};

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  // ✅ промяна на username от settings
  const updateUsername = async (username) => {
    if (!auth.currentUser) return;
    await updateDoc(doc(db, "users", auth.currentUser.uid), { username });
    setProfile((p) => ({ ...(p || {}), username }));
  };

  // ✅ resend verification (ще ти е полезно)
  const resendVerification = async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      register,
      login,
      logout,
      resetPassword,
      updateUsername,
      resendVerification,
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
