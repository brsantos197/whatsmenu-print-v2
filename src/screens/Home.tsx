import { useCallback, useEffect, useState } from 'react';
import { View, DeviceEventEmitter, ScrollView, useColorScheme, PermissionsAndroid, Permission } from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons'

import colors from 'tailwindcss/colors'

import { RequestType } from '../@types/request.type';
import { BluetoothPrinter, useThermalPrinter } from '../hooks/useThermalPrinter';
import { useWebSocket } from '../hooks/useWebSocket';
import { getUser, removeUser } from '../storage/user';

import { Page } from '../components/Page';
import { TextStyled } from '../components/TextStyled';
import { Button } from '../components/Button';
import { DevicesModal } from '../components/DevicesModal';
import { getLocalPrinters, setLocalPrinters } from '../storage/printers';
import { printText } from '../services/print.service';
import { registerTaskWebSocket } from '../services/background.service';
import { createURL, useURL } from 'expo-linking';

type RouteParams = {
  updatePrinters?: boolean
}

export const Home = () => {
  const { navigate, dispatch } = useNavigation()
  const { params } = useRoute()
  const { devices, print } = useThermalPrinter()
  const colorScheme = useColorScheme()

  const [profile, setProfile] = useState<any>()
  const [printers, setPrinters] = useState<BluetoothPrinter[]>([])
  const [showDevices, setShowDevices] = useState(false)

  const { socket, connect } = useWebSocket(profile)

  const redirectURL = useURL()
  const url = createURL('print', {})
  console.log(url);
  console.log(redirectURL);


  const handleLogOff = async () => {
    await removeUser()
    navigate('auth')
  }

  const requestBatteryOp = async () => {
    const result = PermissionsAndroid.request("android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" as Permission)
    console.log(result);
  }

  const printerConfig = (printer: BluetoothPrinter) => {
    navigate('printer', { printer })
  }

  const printForAllPrinters = useCallback(async (text: string) => {
    for (const printer of printers) {
      try {
        await print(text, printer)
        printer.error = false
      } catch (error) {
        printer.error = true
        console.error(error);
      } finally {
        await setLocalPrinters(printers)
        console.log(printers);
        setPrinters(() => [...printers])
      }
    }
  }, [printers, profile])

  const printRequest = useCallback(async (request: RequestType) => {
    const text = printText(request, profile)
    await printForAllPrinters(text)
  }, [printers, profile])

  useEffect(() => {
    if (printers.length) {
      setLocalPrinters(printers)
    }
  }, [printers])

  useEffect(() => {
    if ((params as RouteParams)?.updatePrinters) {
      getLocalPrinters()
        .then(localPrinters => {
          if (localPrinters) {
            setPrinters(localPrinters)
          }
        })
    }
  }, [params])

  useEffect(() => {
    if (profile) {
      DeviceEventEmitter.removeAllListeners('request')
      DeviceEventEmitter.addListener('request', async (request) => {
        await printRequest(request)
      })
    }
  }, [profile, printers])

  useEffect(() => {
    getUser()
      .then(user => {
        if (user && !profile) {
          setProfile(user.profile)
          dispatch(state => {
            const routes = state.routes.filter(r => r.name !== 'auth');

            return CommonActions.reset({
              ...state,
              routes,
              index: routes.length - 1,
            });
          })
        }
      })

    getLocalPrinters()
      .then(localPrinters => {
        if (localPrinters) {
          setPrinters(localPrinters)
        }
      })
    registerTaskWebSocket()
    DeviceEventEmitter.addListener('background-pong', () => {
      console.log('caiu aqui pong front');
      if (socket) {
        if (socket.readyState === socket.CLOSED) {
          connect()
        } else {
          socket?.send(JSON.stringify({ t: 8 }))
        }
      }
    })
    requestBatteryOp()
  }, [])

  return (
    <Page className='justify-start'>
      <View className='dark:bg-zinc-800 light:bg-zinc-400 p-4 mb-1 w-screen'>
        <TextStyled className='text-2xl font-bold'>Configurações</TextStyled>
      </View>
      <View className='dark:bg-zinc-800 light:bg-zinc-400  p-4 w-screen flex-row gap-x-2 mt-2 items-center justify-center'>
        <Button
          onPress={() => printForAllPrinters('[CONTENT][C]\x1B<b>WHATSMENU IMPRESSORA</b>\n\n')}
        >
          <TextStyled>Testar Impressão</TextStyled>
        </Button>
        <Button
          onPress={() => setShowDevices(true)}
        >
          <TextStyled>Selecionar Impressoras</TextStyled>
        </Button>
      </View>
      <View className='w-screen p-4 flex-1 items-start justify-start'>
        <TextStyled className='font-bold text-2xl mb-4'>Impressoras:</TextStyled>
        <ScrollView className='w-full'>
          {printers?.map(printer => (
            <View className={`flex-row items-center justify-between p-2 ${printer.error ? 'bg-red-500/30 border border-red-500' : ''}`} key={printer.deviceName}>
              <View className='flex-row items-center justify-between'>
                {printer.error && (
                  <View className='mr-4'>
                    <MaterialIcons name='error' size={22} color={colors.red[500]} />
                  </View>
                )}
                <TextStyled className='text-lg'>{printer.deviceName} {printer.nickname && `- (${printer.nickname})`}</TextStyled>
              </View>
              <Button
                onPress={() => printerConfig(printer)}
              >
                <MaterialIcons name="settings" size={16} color={colorScheme === 'dark' ? colors.zinc[50] : colors.zinc[950]} ></MaterialIcons>
              </Button>
            </View>
          ))}
        </ScrollView>
      </View>
      <Button
        className='w-screen absolute bottom-0'
        onPress={handleLogOff}
      >
        <TextStyled>Deslogar</TextStyled>
      </Button>

      <DevicesModal
        show={showDevices}
        devices={devices}
        printers={printers}
        cancel={() => setShowDevices(false)}
        confirm={() => setShowDevices(false)}
        onConfirm={(selectedPrinters) => {
          setPrinters(selectedPrinters)
        }}
      />
    </Page>
  );
}