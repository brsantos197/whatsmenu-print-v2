import { useEffect } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import useBLE from '../hooks/useBLE';
import { useWebSocket } from '../hooks/useWebSocket';
import { Device } from 'react-native-ble-plx';

export const Home = () => {
  const { allDevices, requestPermissions, scanForPeripherals, connectToDevice, connectedDevice } = useBLE()

  const { ws } = useWebSocket()

  const connect = async (device: Device) => {
    try {
      
      const connectedDevice = await device.connect()
  
      // Serviço e característica específicos para envio de dados para a impressora térmica
      const serviceUUID = '000018f0-0000-1000-8000-00805f9b34fb';
      const characteristicUUID = '00002af1-0000-1000-8000-00805f9b34fb';
  
      // Crie um buffer contendo o texto a ser impresso
      const text = 'Hello, World!';
      // const encoder = new TextEncoder();
      // const data = encoder.encode(text);
  
      // Obtenha o serviço e a característica correspondentes
      // const service = await connectedDevice.discoverService(serviceUUID);
      // const characteristic = await service.characteristic(characteristicUUID);
  
      const test = await connectedDevice.discoverAllServicesAndCharacteristics();
      const services = await test.services()
      const characteristic = await test.characteristicsForService(serviceUUID)

      const result = await test.writeCharacteristicWithResponseForService(serviceUUID, characteristicUUID, 'aGVsbG8gbWlzcyB0YXBweQ==')
      console.log(result, 'aqui');
  
      // Escreva os dados na característica para enviar à impressora térmica
      await characteristic[0].writeWithResponse('sadasdasdas');
    } catch (error) {
      console.error(error);
      
    }
    
  }

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
          <TouchableOpacity className='bg-blue-500 items-center p-2 rounded-md' onPress={() => { connect(device) }} ><Text className='text-white'>Conectar</Text></TouchableOpacity>
        </View>
      ))}
    </View>
  );
}