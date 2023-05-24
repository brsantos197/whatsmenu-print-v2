import { useEffect } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import useBLE from '../hooks/useBLE';

export const Home = () => {
  const { allDevices, requestPermissions, scanForPeripherals, connectToDevice, connectedDevice } = useBLE()

  useEffect(() => {
    requestPermissions().then(isGranted => {
      if (isGranted) {
        scanForPeripherals()
      }
    })
  }, [])

  console.log(connectedDevice)
  return (
    <View>
      <Text className='text-blue-600'>Home</Text>
      {allDevices.map((device) => (
        <View key={device.id}>
          <Text className='text-white'>{device.name}</Text>
          <TouchableOpacity className='bg-blue-500 items-center p-2 rounded-md' onPress={() => { connectToDevice(device) }} ><Text className='text-white'>Conectar</Text></TouchableOpacity>
        </View>
      ))}
    </View>
  );
}