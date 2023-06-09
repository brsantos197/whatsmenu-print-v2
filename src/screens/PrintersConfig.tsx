import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, DeviceEventEmitter, ScrollView, TouchableOpacity, View, useColorScheme } from 'react-native';

import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import colors from 'tailwindcss/colors';

import { BluetoothPrinter, useThermalPrinter } from '../hooks/useThermalPrinter';
import { useWebSocket } from '../hooks/useWebSocket';
import { removeUser } from '../storage/user';

import notifee, { AndroidImportance, EventType } from "@notifee/react-native";
import BackgroundTimer from 'react-native-background-timer';
import { BatteryOptEnabled, RequestDisableOptimization } from "react-native-battery-optimization-check";
import { BleManager } from 'react-native-ble-plx';
import { Button } from '../components/Button';
import { DevicesModal } from '../components/DevicesModal';
import { Page } from '../components/Page';
import { TextStyled } from '../components/TextStyled';
import { getLocalPrinters, setLocalPrinters } from '../storage/printers';
import { Loading } from '../components/Loading';

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
  const [sound, setSound] = useState<Audio.Sound>()
  const [wsStatus, setWsStatus] = useState<{
    statusText: 'Conectando...' | 'Conectado' | 'Desconectando...' | 'Desconectado',
    color: string,
  }>({ statusText: 'Conectando...', color: colors.yellow[500] })
  const [loading, setLoading] = useState<{ show: boolean, text?: string }>({ show: false })

  const playSound = async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playThroughEarpieceAndroid: false
    });

    const { sound } = await Audio.Sound.createAsync(require('../../audio/pedido.mp3'))
    setSound(sound)
    await sound.playAsync()
  }

  const displayNotification = async (type: 'request' | 'ws:disconnected' | 'ws:connected' = 'request') => {
    await notifee.requestPermission()

    const channelId = await notifee.createChannel({
      id: 'app',
      name: 'requests',
      vibration: true,
      importance: AndroidImportance.HIGH
    })

    switch (type) {
      case 'request': {
        await notifee.displayNotification({
          id: 'request',
          title: 'Olha o pedido, WhatsMenu!',
          body: 'Chegou pedido pra impressão.',
          android: { channelId }
        })
        break;
      }
      case 'ws:disconnected': {
        await notifee.cancelAllNotifications(['connected'])
        await notifee.displayNotification({
          id: 'disconnected',
          title: 'Desconectado!',
          body: 'Sua conexão com o servidor de impressões foi perdida.',
          android: { channelId }
        })
        break;
      }
      case 'ws:connected': {
        await notifee.cancelAllNotifications(['desconnected'])
        await notifee.displayNotification({
          id: 'connected',
          title: 'Conectado!',
          body: 'Conectado com sucesso com o servidor de impressões.',
          android: { channelId }
        })
        break;
      }
    }
  }
  const { socket, connect } = useWebSocket(profile, { onClose: async () => { await displayNotification('ws:disconnected') }, onConnected: async () => { await displayNotification('ws:connected') } })

  const printerConfig = (printer: BluetoothPrinter) => {
    navigate('printer', { printer })
  }

  const printForAllPrinters = async (data: any) => {
    setLoading({ text: 'Imprimindo...', show: true })
    const printers = await getLocalPrinters()
    if (printers.length) {
      for (const printer of printers) {
        try {
          await print(data, printer)
          printer.error = false
        } catch (error) {
          printer.error = true
          console.error(error);
        } finally {
          await setLocalPrinters(printers)
          setLoading({ text: undefined, show: false })
        }
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
    try {
      setLoading(state => ({ text: 'Saindo...', show: true }))
      await removeUser()
      socket?.close(1000, 'logoff')
      setProfile(null)
      navigate('auth')
    } catch (error) {
      Alert.alert('Ops!', 'Não foi possível deslogar')
      console.error(error);
    } finally {
      setLoading(state => ({ text: undefined, show: false }))
    }
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
          index: routes?.length - 1,
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
    let request: { 58: string, 80: string } | null = null
    DeviceEventEmitter.addListener('request:print', async (requestData) => {
      displayNotification()
      if (requestData[58] || requestData[80]) {
        await playSound()
        request = requestData
      }
    })
    DeviceEventEmitter.addListener('request:directPrint', (requestData) => {
      request = requestData
    })

    DeviceEventEmitter.addListener('printers:updated', (localPrinters: BluetoothPrinter[]) => {
      setPrinters([...localPrinters])
    })

    BackgroundTimer.setInterval(() => {
      if (request) {
        printForAllPrinters(request)
        request = null
      }
    }, 500)

  }, [])

  useEffect(() => {
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

  // NOTIFICATIONS
  useEffect(() => {
    return notifee.onForegroundEvent(({ type, detail }) => {
      switch (type) {
        case EventType.PRESS:
          if (detail.notification?.id === 'disconnected') {
            connect()
          }
          break;
        case EventType.DISMISSED:
          console.log("Descartou na notificação")
          break;
      }
    })
  }, [])

  useEffect(() => {
    return notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {

        if (detail.notification?.id === 'disconnected') {
          connect()
        }
      }
    })
  }, [])

  // SOUND
  useEffect(() => {
    return sound
      ? () => {
        sound.unloadAsync()
      }
      : undefined
  }, [sound])

  return (
    <Page className='justify-start relative'>
      <View className='bg-zinc-200 dark:bg-zinc-800 p-4 mb-1 w-screen'>
        <TextStyled className='text-2xl font-bold'>Configurações</TextStyled>
      </View>
      <View className='bg-zinc-200 dark:bg-zinc-800 p-4 w-screen flex-row gap-x-2 mt-2 items-center justify-center'>
        <Button
          onPress={async () => {
            await printForAllPrinters({ 58: '[C]WHATSMENU IMPRESSORA\n\n', 80: '[C]WHATSMENU IMPRESSORA\n\n', test: true })
          }}
        >
          <TextStyled>Testar Impressão</TextStyled>
        </Button>
        <Button
          onPress={async () => {
            await getDevices()
            setShowDevices(true)
          }}
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
            {wsStatus.statusText === 'Desconectado' && (
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
              printers.map(printer => (
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
      <Loading show={loading.show} text={loading.text} size='large' />
    </Page>
  );
}