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
import BackgroundTimer from 'react-native-background-timer';
import notifee, { AndroidImportance } from "@notifee/react-native";

type RouteParams = {
  updatePrinters?: boolean
}

export const PrintersConfig = () => {
  const { navigate, dispatch } = useNavigation()
  const { devices, print, getDevices } = useThermalPrinter()
  const colorScheme = useColorScheme()
  const bleManager = useMemo(() => new BleManager(), []);

  const [profile, setProfile] = useState<any>()
  const [printers, setPrinters] = useState<BluetoothPrinter[]>([])
  const [showDevices, setShowDevices] = useState(false)
  useKeepAwake()
  const { socket, connect } = useWebSocket(profile)

  const displayNotification = async () => {
    await notifee.requestPermission()

    const channelId = await notifee.createChannel({
      id: 'test',
      name: 'requests',
      vibration: true,
      importance: AndroidImportance.HIGH
    })

    await notifee.displayNotification({
      id: '7',
      title: 'Olha o pedido, WhatsMenu!',
      body: 'Chegou pedido pra impressão.',
      android: { channelId }
    })
  }

  const requestBatteryOp = async () => {
    PermissionsAndroid.request("android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" as Permission)
  }

  const printerConfig = (printer: BluetoothPrinter) => {
    displayNotification()
    navigate('printer', { printer })
  }

  const printForAllPrinters = async (text: string) => {
    const printers = await getLocalPrinters()
    for (const printer of printers) {
      try {
        await print(text, printer)
        printer.error = false
      } catch (error) {
        printer.error = true
        console.error(error);
      } finally {
        await setLocalPrinters(printers)
      }
    }
  }

  const printRequest = async (request: RequestType) => {
    const text = await printText(request)
    printForAllPrinters(text)
  }

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

  // AUTH
  const handleLogOff = async () => {
    await removeUser()
    navigate('auth')
  }

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
    requestBatteryOp()
  }, [])

  useEffect(() => {
    DeviceEventEmitter.removeAllListeners('request:print')
    if (!socket) {
      connect()
    }
    let request: RequestType | null = null
    DeviceEventEmitter.addListener('request:print', (requestData) => {
      displayNotification()
      request = requestData
    })

    DeviceEventEmitter.addListener('printers:updated', (localPrinters: BluetoothPrinter[]) => {
      localPrinters.sort((a, b) => a.error ? 1 : -1)
      setPrinters(localPrinters)
    })

    const intervalId = BackgroundTimer.setInterval(() => {
      if (request) {
        printRequest(request)
        request = null
      }
    }, 500)
  }, [])

  return (
    <Page className='justify-start relative'>
      <View className='bg-zinc-200 dark:bg-zinc-800 p-4 mb-1 w-screen'>
        <TextStyled className='text-2xl font-bold'>Configurações</TextStyled>
      </View>
      <View className='bg-zinc-200 dark:bg-zinc-800 p-4 w-screen flex-row gap-x-2 mt-2 items-center justify-center'>
        <Button
          onPress={async () => await printForAllPrinters('[CONTENT][C]<b>WHATSMENU IMPRESSORA</b>\n\n')}
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
        onConfirm={async (selectedPrinters) => {
          setLocalPrinters(selectedPrinters)
        }}
      />
    </Page>
  );
}