/**
 * Contexto de Autenticación y Perfil de Usuario
 * Conectado a Firebase Authentication (correo y contraseña) y PostgreSQL.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, Congregation } from '../types';
import {
  auth,
  firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from '../lib/firebase';
import {
  apiService,
  getActiveCongregationId,
  setActiveCongregationId,
} from '../services/apiService';

interface AuthContextType {
  currentUser: UserProfile | null;
  currentRole: UserRole | null;
  isMasterAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  activeCongregationId: string;
  availableCongregations: Congregation[];
  isBootstrapAdmin: boolean;
  hasCongregation: boolean;
  switchCongregation: (congregationId: string) => Promise<void>;
  refreshCongregations: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  requestPasswordRecovery: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isBootstrapAdmin, setIsBootstrapAdmin] = useState<boolean>(false);
  const [hasCongregation, setHasCongregation] = useState<boolean>(false);
  const [activeCongregationId, setActiveCongIdState] = useState<string>(() =>
    getActiveCongregationId()
  );
  const [availableCongregations, setAvailableCongregations] = useState<Congregation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Escuchar cambios de autenticación de Firebase
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      setError(null);
      if (user && user.email) {
        try {
          const profile = await apiService.syncAuthUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || undefined,
          });
          setCurrentUser(profile);
          setIsBootstrapAdmin(Boolean(profile.isMasterAdmin));
          setHasCongregation(Boolean(profile.congregationId));

          const congId = getActiveCongregationId() || profile.congregationId;
          if (congId) {
            setActiveCongIdState(congId);
            setActiveCongregationId(congId);
          }

          const congs = await apiService.getCongregationsList();
          setAvailableCongregations(congs);
        } catch (err: any) {
          console.error('Error sincronizando perfil de usuario:', err);
          setCurrentUser(null);
          setIsBootstrapAdmin(false);
          setHasCongregation(false);
          setError(err.message || 'Error al sincronizar con la base de datos.');
        } finally {
          setIsLoading(false);
        }
      } else {
        setCurrentUser(null);
        setIsBootstrapAdmin(false);
        setHasCongregation(false);
        setAvailableCongregations([]);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const switchCongregation = async (congId: string) => {
    setActiveCongIdState(congId);
    setActiveCongregationId(congId);
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        congregationId: congId,
      });
    }
  };

  const refreshCongregations = async () => {
    try {
      const list = await apiService.getCongregationsList();
      setAvailableCongregations(list);
    } catch (e) {
      console.error('Error actualizando lista de congregaciones:', e);
    }
  };

  const refreshUserProfile = async () => {
    try {
      const { profile } = await apiService.getMyProfile();
      if (profile) {
        setCurrentUser(profile);
        setIsBootstrapAdmin(Boolean(profile.isMasterAdmin));
        setHasCongregation(Boolean(profile.congregationId));
      }
    } catch (err) {
      console.error('Error al recargar perfil:', err);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      if (result.user.email) {
        const profile = await apiService.syncAuthUser({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || undefined,
        });
        setCurrentUser(profile);
      }
    } catch (err: any) {
      console.error('Error al iniciar sesión con correo:', err);
      setError(err.message || 'Credenciales inválidas.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (result.user.email) {
        const profile = await apiService.syncAuthUser({
          uid: result.user.uid,
          email: result.user.email,
          displayName: name,
        });
        setCurrentUser(profile);
      }
    } catch (err: any) {
      console.error('Error al registrar usuario:', err);
      setError(err.message || 'Error al crear la cuenta.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordRecovery = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const user = auth.currentUser;
    if (!user?.email) {
      throw new Error('Inicia sesión nuevamente para cambiar tu contraseña.');
    }
    if (!user.providerData.some((provider) => provider.providerId === 'password')) {
      throw new Error(
        'Esta cuenta no tiene habilitado el acceso con correo y contraseña. Usa la recuperación de contraseña o contacta al administrador.'
      );
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch {
      // Ignorar
    }
    setCurrentUser(null);
    setActiveCongregationId('');
    setActiveCongIdState('');
    setIsLoading(false);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser?.role || null,
        isMasterAdmin: Boolean(currentUser?.isMasterAdmin || isBootstrapAdmin),
        isLoading,
        error,
        activeCongregationId,
        availableCongregations,
        isBootstrapAdmin,
        hasCongregation,
        switchCongregation,
        refreshCongregations,
        loginWithEmail,
        registerWithEmail,
        requestPasswordRecovery,
        changePassword,
        logout,
        clearError,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
