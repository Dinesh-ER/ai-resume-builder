import { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider, isFirebaseConfigured } from "../utils/firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        },
        (err) => {
          console.error("Auth state change error:", err);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } else {
      // Offline/Demo Mode: Check if a demo user session is saved in localStorage
      try {
        const savedUser = localStorage.getItem("demo_user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.error("Failed to read demo_user from localStorage:", e);
      }
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = async () => {
    setError(null);
    if (isFirebaseConfigured && auth && googleProvider) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
      } catch (err) {
        console.error("Firebase Sign-In Error:", err);
        setError(err.message || "Failed to sign in with Google.");
        throw err;
      }
    } else {
      // Mock Demo Sign-In
      return new Promise((resolve) => {
        setLoading(true);
        setTimeout(() => {
          const mockUser = {
            uid: "demo-user-id-12345",
            displayName: "Dinesh Kumar (Demo)",
            email: "dinesh.demo@example.com",
            photoURL: "https://api.dicebear.com/7.x/adventurer/svg?seed=Dinesh"
          };
          setUser(mockUser);
          localStorage.setItem("demo_user", JSON.stringify(mockUser));
          setLoading(false);
          resolve(mockUser);
        }, 800); // Simulate network latency
      });
    }
  };

  const logout = async () => {
    setError(null);
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Firebase Sign-Out Error:", err);
        setError(err.message || "Failed to sign out.");
        throw err;
      }
    } else {
      // Mock Demo Sign-Out
      setUser(null);
      localStorage.removeItem("demo_user");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        loginWithGoogle,
        logout,
        isFirebaseConfigured
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
