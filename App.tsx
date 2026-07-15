import 'react-native-gesture-handler';

import React, {useEffect} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import {
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

export default function App() {
  const restoreSession = useAuthStore(
    state => state.restoreSession,
  );

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await restoreSession();
      } catch (error) {
        console.error(
          'Unable to restore authentication session:',
          error,
        );
      }
    };

    initializeApp();
  }, [restoreSession]);

  return (
  <GestureHandlerRootView style={{flex: 1}}>
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}