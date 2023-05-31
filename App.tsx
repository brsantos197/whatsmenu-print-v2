import { Routes } from './src/routes';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaView className="flex-1 dark:bg-zinc-950 light:bg-zinc-50">
      <StatusBar />
      <Routes />
    </SafeAreaView>
  );
}