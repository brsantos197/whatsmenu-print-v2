import { useCallback, useEffect, useState } from 'react';
import { View, DeviceEventEmitter, ScrollView, useColorScheme, Switch } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { DateTime } from 'luxon';

import colors from 'tailwindcss/colors'

import { PizzaCartType, ProductCartType, RequestType } from '../@types/request.type';
import { BluetoothPrinter, useThermalPrinter } from '../hooks/useThermalPrinter';
import { useWebSocket } from '../hooks/useWebSocket';
import { getUser, removeUser } from '../storage/user';

import { Page } from '../components/Page';
import { TextStyled } from '../components/TextStyled';
import { Button } from '../components/Button';
import { DevicesModal } from '../components/DevicesModal';
import { getLocalPrinters, setLocalPrinters } from '../storage/printers';

export const Home = () => {
  const { navigate, dispatch } = useNavigation()
  const { devices, print } = useThermalPrinter()
  const colorScheme = useColorScheme()

  const [profile, setProfile] = useState<any>()
  const [printers, setPrinters] = useState<BluetoothPrinter[]>([])
  const [showDevices, setShowDevices] = useState(false)

  const { socket } = useWebSocket(profile)

  const handleLogOff = async () => {
    await removeUser()
    navigate('auth')
  }

  const cartPrintLayout = (type: 'product' | 'pizza', cart: ProductCartType[] | PizzaCartType[]): string => {
    let text = ''
    if (type === 'pizza') {
      for (const pizza of cart as PizzaCartType[]) {
        text +=
          `${pizza.quantity}x | ${pizza.size} ${pizza.flavors.length} Sabor${pizza.flavors.length > 1 ? 'es' : ''} (${pizza.value})\n` +
          pizza.flavors.map(flavor => `    ${flavor.name}\n`).join('') +
          pizza.implementations.map(implementation => `    ${implementation.name} (${implementation.value})\n`).join('') +
          `[R]${pizza.value}\n` +
          '<hr>'
      }
    }
    if (type === 'product') {

    }
    return text
  }

  const printText = (request: RequestType): string => {
    let text = ''
    text += `[C]<font size='big'><b>${profile.name}</b></font>\n\n`
    text += `<b>${DateTime.fromSQL(request.created_at, { zone: profile.timeZone }).toFormat("dd/MM/yyyy HH:mm:ss")}</b>\n`
    for (const [key, value] of Object.entries(request)) {
      switch (key) {
        case 'code': {
          text += `<b>Pedido:</b> wm${value}-${request.type}\n`
          break
        }
        case 'name': {
          text += `<b>Cliente:</b> ${value}\n`
          break
        }
        case 'contact': {
          text += `<b>Tel:</b> ${value}\n<hr>`
          break
        }
        case 'cartPizza': {
          text += cartPrintLayout('pizza', value)
          break
        }
      }

    }
    return text
  }

  const printerConfig = (printer: BluetoothPrinter) => {
    navigate('printer', {
      printer
    })
  }

  const printForAllPrinters = useCallback(async (text: string) => {
    for (const printer of printers) {
      await print(text, printer.macAddress, 58)
    }
  }, [printers, profile])

  const printRequest = useCallback(async (request: RequestType) => {
    const text = printText(request)
    await printForAllPrinters(text)
  }, [printers, profile])

  useEffect(() => {
    if (printers.length) {
      setLocalPrinters(printers)
    }
  }, [printers])

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
        setPrinters(localPrinters)
      })


  }, [])

  return (
    <Page className='justify-start'>
      <View className='dark:bg-zinc-800 light:bg-zinc-400 p-4 mb-1 w-screen'>
        <TextStyled className='text-2xl font-bold'>Configurações</TextStyled>
      </View>
      <View className='dark:bg-zinc-800 light:bg-zinc-400  p-4 w-screen flex-row gap-x-2 mt-2 items-center justify-center'>
        <Button
          onPress={() => printForAllPrinters('[C]<b>WHATSMENU IMPRESSORA</b>\n\n')}
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
          {printers.map(printer => (
            <View className='flex-row items-center justify-between p-2' key={printer.deviceName}>
              <TextStyled className='text-lg'>{printer.deviceName}</TextStyled>
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

// TaskManager.defineTask('PRINT_WEBSOCKETS', async () => {
//   // DeviceEventEmitter.emit('background-pong', new Date().toISOString())
//   console.log('BACKGROUND MODE')
//   new Promise((resolve) => setTimeout(() => resolve('foi'), 2000)).then(data => console.log(data))
//   console.log(BackgroundFetch.BackgroundFetchResult.NewData);

//   // Be sure to return the successful result type!
//   return BackgroundFetch.BackgroundFetchResult.NewData;
// })