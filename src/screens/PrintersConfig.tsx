import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, DeviceEventEmitter, Permission, PermissionsAndroid, ScrollView, View, useColorScheme } from 'react-native';

import colors from 'tailwindcss/colors';

import { RequestType } from '../@types/request.type';
import { BluetoothPrinter, useThermalPrinter } from '../hooks/useThermalPrinter';
import { useWebSocket } from '../hooks/useWebSocket';
import { getUser, removeUser } from '../storage/user';

import { createURL, useURL } from 'expo-linking';
import { Button } from '../components/Button';
import { DevicesModal } from '../components/DevicesModal';
import { Page } from '../components/Page';
import { TextStyled } from '../components/TextStyled';
import { registerTaskWebSocket } from '../services/background.service';
import { printText } from '../services/print.service';
import { getLocalPrinters, setLocalPrinters } from '../storage/printers';
import { BleManager } from 'react-native-ble-plx';
import { useKeepAwake } from 'expo-keep-awake';

type RouteParams = {
  updatePrinters?: boolean
}

export const PrintersConfig = () => {
  const { navigate, dispatch } = useNavigation()
  const { params } = useRoute()
  const { devices, print, getDevices } = useThermalPrinter()
  const colorScheme = useColorScheme()
  const bleManager = useMemo(() => new BleManager(), []);

  const [profile, setProfile] = useState<any>()
  const [printers, setPrinters] = useState<BluetoothPrinter[]>([])
  const [showDevices, setShowDevices] = useState(false)
  useKeepAwake()

  // const { socket, connect } = useWebSocket(profile)

  let redirectURL = useURL()
  console.log(redirectURL);

  const requestBatteryOp = async () => {
    PermissionsAndroid.request("android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" as Permission)
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

  const showBluetoothAlert = () => {
    Alert.alert(
      'Bluetooth Desativado',
      'As impressões automáticas não funcionaram',
      [
        {
          text: 'Deixar desativado',
          style: 'cancel',
        },
        {
          text: 'Ativar',
          onPress: async () => {
            await bleManager.enable()
            await getDevices()
          },
          style: 'default',
        },
      ],
      {
        cancelable: true,
      },
    );
  }

  useEffect(() => {
    if (printers.length) {
      setLocalPrinters(printers)
    }
  }, [printers])

  useEffect(() => {
    if (redirectURL) {
      printForAllPrinters('teste').then(() => {
      })
      redirectURL = null
    }
  }, [redirectURL])

  useEffect(() => {
    if ((params as RouteParams)?.updatePrinters) {
      getLocalPrinters()
        .then(localPrinters => {
          if (localPrinters) {
            setPrinters(localPrinters)
          }
        })
        .catch(error => console.error)
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
    // getUser()
    //   .then(user => {
    //     if (user && !profile) {
    //       setProfile(user.profile)
    //       dispatch(state => {
    //         const routes = state.routes.filter(r => r.name !== 'auth');

    //         return CommonActions.reset({
    //           ...state,
    //           routes,
    //           index: routes.length - 1,
    //         });
    //       })
    //     }
    //   })

    bleManager.state()
      .then(state => {
        if (state === 'PoweredOff') {
          showBluetoothAlert()
        }
      })
      .catch(error => console.error)
    bleManager.onStateChange((state) => {
      if (state === 'PoweredOff') {
        showBluetoothAlert()
      }
    })
    getLocalPrinters()
      .then(localPrinters => {
        if (localPrinters) {
          setPrinters(localPrinters)
        }
      })

    // registerTaskWebSocket()
    // DeviceEventEmitter.addListener('background-pong', () => {
    //   if (socket) {
    //     if (socket.readyState === socket.CLOSED) {
    //       connect()
    //     } else {
    //       socket?.send(JSON.stringify({ t: 8 }))
    //     }
    //   }
    // })
    requestBatteryOp()
  }, [])

  return (
    <Page className='justify-start relative'>
      <View className='bg-zinc-200 dark:bg-zinc-800 p-4 mb-1 w-screen'>
        <TextStyled className='text-2xl font-bold'>Configurações</TextStyled>
      </View>
      <View className='bg-zinc-200 dark:bg-zinc-800 p-4 w-screen flex-row gap-x-2 mt-2 items-center justify-center'>
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
                <MaterialIcons name="settings" size={16} color={colorScheme === 'dark' ? colors.zinc[50] : colors.zinc[800]} ></MaterialIcons>
              </Button>
            </View>
          ))}
        </ScrollView>
      </View>
      {/* <Button
        className='w-screen absolute bottom-0'
        onPress={handleLogOff}
      >
        <TextStyled>Deslogar</TextStyled>
      </Button> */}

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