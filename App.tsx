import { View } from 'react-native';
import { Routes } from './src/routes';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <View className="flex-1 dark:bg-zinc-950 light:bg-zinc-50">
      <StatusBar />
      <Routes />
    </View>
  );
}