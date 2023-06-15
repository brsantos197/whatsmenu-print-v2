import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, DeviceEventEmitter, Permission, PermissionsAndroid, ScrollView, TouchableOpacity, View, useColorScheme } from 'react-native';

import colors from 'tailwindcss/colors';

import { RequestType } from '../@types/request.type';
import { BluetoothPrinter, useThermalPrinter } from '../hooks/useThermalPrinter';
import { useWebSocket } from '../hooks/useWebSocket';
import { removeUser } from '../storage/user';

import notifee, { AndroidImportance } from "@notifee/react-native";
import BackgroundTimer from 'react-native-background-timer';
import { BatteryOptEnabled, RequestDisableOptimization } from "react-native-battery-optimization-check";
import { BleManager } from 'react-native-ble-plx';
import { Button } from '../components/Button';
import { DevicesModal } from '../components/DevicesModal';
import { Page } from '../components/Page';
import { TextStyled } from '../components/TextStyled';
import { printText } from '../services/print.service';
import { getLocalPrinters, setLocalPrinters } from '../storage/printers';

export const PrintersConfig = () => {
  const { navigate, dispatch } = useNavigation()
  const { params } = useRoute()
  const { user } = params as { user: any }
  const { devices, print, getDevices } = useThermalPrinter()
  const colorScheme = useColorScheme()
  const bleManager = useMemo(() => new BleManager(), []);

  const [profile, setProfile] = useState<any>()
  const [printers, setPrinters] = useState<BluetoothPrinter[]>([])
  const [showDevices, setShowDevices] = useState(false)
  const [wsStatus, setWsStatus] = useState<{
    statusText: 'Conectando...' | 'Conectado' | 'Desconectando...' | 'Desconectado',
    color: string,
  }>({ statusText: 'Conectando...', color: colors.yellow[500] })
  const displayNotification = async (type: 'request' | 'ws:disconnected' = 'request') => {
    await notifee.requestPermission()

    const channelId = await notifee.createChannel({
      id: 'app',
      name: 'requests',
      vibration: true,
      importance: AndroidImportance.HIGH
    })

    switch (type) {
      case 'request':
        await notifee.displayNotification({
          id: '7',
          title: 'Olha o pedido, WhatsMenu!',
          body: 'Chegou pedido pra impressão.',
          android: { channelId }
        })
        break;
      case 'ws:disconnected':
        await notifee.displayNotification({
          id: '9',
          title: 'Desconectado!',
          body: 'Sua conexão com o servidor de impressões foi perdida.',
          android: { channelId }
        })
        break;
    }
  }
  const { socket, connect } = useWebSocket(profile, async () => { await displayNotification('ws:disconnected') })

  const printerConfig = (printer: BluetoothPrinter) => {
    navigate('printer', { printer })
  }
  
  const printForAllPrinters = async (data: any) => {
    const printers = await getLocalPrinters()
    for (const printer of printers) {
      try {
        await print(data, printer)
        printer.error = false
      } catch (error) {
        printer.error = true
        console.error(error);
      } finally {
        await setLocalPrinters(printers)
      }
    }
  }

  // const printRequest = async (request: RequestType) => {
  //   const text = await printText(request)
  //   printForAllPrinters(text)
  // }

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
    socket?.close(1000, 'logoff')
    setProfile(null)
    navigate('auth')
  }

  useEffect(() => {
    if (user && !profile) {
      setProfile(user.profile)
      connect()
      dispatch(state => {
        const routes = state.routes.filter(r => r.name !== 'auth');

        return CommonActions.reset({
          ...state,
          routes,
          index: routes.length - 1,
        });
      })
    }
  }, [user])

  useEffect(() => {
    // BATTERY
    BatteryOptEnabled().then((isEnabled: boolean) => {
      if (isEnabled) {
        RequestDisableOptimization();
      }
    });

    // BLUETOOTH
    bleManager.state()
      .then(state => {
        if (state === 'PoweredOff') {
          showBluetoothAlert()
        }
      })
      .catch(console.error)
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
  }, [])

  useEffect(() => {
    DeviceEventEmitter.removeAllListeners('request:print')
    DeviceEventEmitter.removeAllListeners('request:directPrint')
    // if (!socket) {
    //   connect()
    // }
    let request: { 58: string, 80: string } | null = null
    DeviceEventEmitter.addListener('request:print', (requestData) => {
      displayNotification()
      request = requestData
    })
    DeviceEventEmitter.addListener('request:directPrint', (requestData) => {
      request = requestData
    })

    DeviceEventEmitter.addListener('printers:updated', (localPrinters: BluetoothPrinter[]) => {
      localPrinters.sort((a) => a.error ? 1 : -1)
      setPrinters(localPrinters)
    })

    BackgroundTimer.setInterval(() => {
      if (request) {
        printForAllPrinters(request)
        request = null
      }
    }, 500)

  }, [])

  useEffect(() => {
    // console.log(socket?.readyState, "SOCKET STATUS");
    switch (socket?.readyState) {
      case 0:
        setWsStatus({ statusText: 'Conectando...', color: colors.yellow[500] })
        break;
      case 1:
        setWsStatus({ statusText: 'Conectado', color: colors.green[500] })
        break;
      case 2:
        setWsStatus({ statusText: 'Desconectando...', color: colors.orange[500] })
        break;
      case 3:
        setWsStatus({ statusText: 'Desconectado', color: colors.red[500] })
        break;
    }
    
  }, [socket?.readyState])

  return (
    <Page className='justify-start relative'>
      <View className='bg-zinc-200 dark:bg-zinc-800 p-4 mb-1 w-screen'>
        <TextStyled className='text-2xl font-bold'>Configurações</TextStyled>
      </View>
      <View className='bg-zinc-200 dark:bg-zinc-800 p-4 w-screen flex-row gap-x-2 mt-2 items-center justify-center'>
        <Button
          onPress={async () => await printForAllPrinters({ 58: '[C]WHATSMENU IMPRESSORA\n\n', 80: '[C]WHATSMENU IMPRESSORA\n\n', test: true })}
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
        <View className='w-full flex-row items-center mb-1 justify-between'>
          <TextStyled className='font-bold'>Servidor de Impressões:</TextStyled>
          <View className='flex-row items-center gap-x-2'>
            <View className={`flex-row items-center gap-x-4 py-1 px-2 rounded-lg`} style={{ backgroundColor: `${wsStatus.color}66` }}>
              <TextStyled>
                {wsStatus.statusText}
              </TextStyled>
              <View className={`p-2 rounded-full`} style={{ backgroundColor: wsStatus.color }} />
            </View>
            { wsStatus.statusText === 'Desconectado' && (
              <TouchableOpacity className='px-2' onPress={() => { connect() }}>
                <MaterialCommunityIcons name='reload' size={20} color={colorScheme === 'dark' ? colors.zinc[50] : colors.zinc[950]} onPress={connect} /> 
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TextStyled className='font-bold text-2xl mb-4'>Impressoras:</TextStyled>
        {!printers.length ? (
          <View className='flex-1 w-full items-center justify-center'>
            <MaterialCommunityIcons name='printer-off-outline' size={72} color={colorScheme === 'dark' ? colors.zinc[50] : colors.zinc[950]} />
            <TextStyled className='font-bold text-2xl text-center mt-2'>Nenhuma impressora selecionada</TextStyled>
          </View>) : (
          <ScrollView className='w-full '>
            {
              printers?.map(printer => (
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
        )}
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