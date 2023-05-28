import { useEffect, useState } from 'react';
import { Text, View, BackHandler, DeviceEventEmitter } from 'react-native';
import { useWebSocket } from '../hooks/useWebSocket';
import { useThermalPrinter } from '../hooks/useThermalPrinter';
import { Page } from '../components/Page';
import { TextStyled } from '../components/TextStyled';
import { useNavigation } from '@react-navigation/native';
import Button from '../components/Button';
import { getUser, removeUser } from '../storage/user/user';

type BluetoothPrinter = {
  deviceName: string;
  macAddress: string;
}

export const Home = () => {
  const [profile, setProfile] = useState()
  const { navigate } = useNavigation()
  const { ws } = useWebSocket(profile)
  const { devices } = useThermalPrinter()

  const handleLogOff = async () => {
    await removeUser()
    navigate('auth')
  }

  useEffect(() => {
    if (ws) {
      DeviceEventEmitter.addListener('request', (request) => {
        console.log(request);
      })
    }

    return () => {
      DeviceEventEmitter.removeAllListeners()
    }
  }, [ws])

  useEffect(() => {
    getUser()
      .then(user => {
        if (user) {
          setProfile(user.profile)
        }
      })
    BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp()
      return true
    })
    return () => BackHandler.removeEventListener('hardwareBackPress', () => {
      BackHandler.exitApp()
      return true
    })
  }, [])

  return (
    <Page>
      <TextStyled>Home</TextStyled>
      {devices.map((device) => (
        <View key={device.macAddress}>
          <Text className='text-white'>{device.deviceName}</Text>
          {/* <TouchableOpacity className='bg-blue-500 items-center p-2 rounded-md' onPress={() => { print(device.macAddress) }} ><Text className='text-white'>Conectar</Text></TouchableOpacity> */}
        </View>
      ))}
      <Button
        className='w-screen absolute bottom-0'
        onPress={handleLogOff}
      >
        <TextStyled>Deslogar</TextStyled>
      </Button>
    </Page>
  );
}