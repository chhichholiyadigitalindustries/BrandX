import React from 'react';
import { AuthScreen, AuthSuccessPayload } from './AuthScreen';
import { BusinessProfile } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (payload?: AuthSuccessPayload) => void;
  business?: BusinessProfile;
  initialMode?: 'signin' | 'signup';
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  business,
  initialMode = 'signin',
}) => {
  return (
    <AuthScreen
      onAuthSuccess={(payload) => onLoginSuccess(payload)}
      currentBusiness={business}
      initialMode={initialMode}
    />
  );
};
