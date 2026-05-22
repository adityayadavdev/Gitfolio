import React, { createContext, useContext, useState, useEffect } from 'react';
import { startDeviceFlow, pollForToken, fetchAuthenticatedUser, storeToken, getStoredToken, clearAuth } from '../services/githubAuth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function initAuth() {
    try {
      const storedToken = await getStoredToken();
      if (storedToken) {
        const userData = await fetchAuthenticatedUser(storedToken);
        setUser(userData);
        setToken(storedToken);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth: fetchAuthenticatedUser failed', error);
      console.error('Auth init failed', error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    initAuth();
  }, []);

  async function startAuth(signal) {
    const deviceFlowData = await startDeviceFlow();
    const { device_code, verification_uri, expires_in, interval } = deviceFlowData;

    pollForToken(device_code, interval, () => {
      // Handle expiry if needed
    }, signal)
      .then(async (accessToken) => {
        try {
          const userData = await fetchAuthenticatedUser(accessToken);
          await storeToken(accessToken);
          setUser(userData);
          setToken(accessToken);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Auth: fetchAuthenticatedUser failed', error);
          throw error;
        }
      })
      .catch((error) => {
        if (error.message !== 'Polling cancelled') {
          console.error('Auth: error caught in pollForToken.catch', error);
          throw error;
        }
      });

    return { 
      user_code: deviceFlowData.user_code, 
      verification_uri, 
      expires_in, 
      interval 
    };
  }

  async function logout() {
    await clearAuth();
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  }

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    initAuth,
    startAuth,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
