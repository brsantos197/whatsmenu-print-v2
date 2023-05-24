import { Text, View } from 'react-native';
import { Home } from './src/screens/Home';

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-black">
      <Home />
    </View>
  );
}