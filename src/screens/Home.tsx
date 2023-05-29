import { useCallback, useEffect, useState } from 'react';
import { Text, View, BackHandler, DeviceEventEmitter } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DateTime } from 'luxon';

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

import { PizzaCartType, ProductCartType, RequestType } from '../@types/request.type';
import { BluetoothPrinter, useThermalPrinter } from '../hooks/useThermalPrinter';
import { useWebSocket } from '../hooks/useWebSocket';
import { getUser, removeUser } from '../storage/user/user';

import { Page } from '../components/Page';
import { TextStyled } from '../components/TextStyled';
import { Button } from '../components/Button';

export const Home = () => {
  const [profile, setProfile] = useState<any>()
  const [printers, setPrinters] = useState<BluetoothPrinter[]>([])
  const { navigate } = useNavigation()
  const { devices, print } = useThermalPrinter()
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

  const printRequest = useCallback(async (request: RequestType) => {
    const text = printText(request)
    for (const printer of printers) {
      await print(text, printer.macAddress, 58)
    }
  }, [printers, profile])

  // const registerBackgroundFetchAsync = async () => {
  //   return BackgroundFetch.registerTaskAsync('PRINT_WEBSOCKETS', {
  //     minimumInterval: 1, // 15 minutes
  //     stopOnTerminate: false, // android only,
  //     startOnBoot: true, // android only
  //   });
  // }

  useEffect(() => {
    if (profile) {
      DeviceEventEmitter.removeAllListeners('request')
      DeviceEventEmitter.addListener('request', async (request) => {
        await printRequest(request)
      })
    }
  }, [profile, printers])

  TaskManager.getRegisteredTasksAsync()
    .then(tasks => {
      console.log(tasks, 'TASKS')
    })
  useEffect(() => {
    // registerBackgroundFetchAsync()
    getUser()
      .then(user => {
        if (user && !profile) {
          setProfile(user.profile)
        }
      })
    BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp()
      return true
    })
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', () => {
        BackHandler.exitApp()
        return true
      })
    }
  }, [])

  return (
    <Page>
      <TextStyled>Home</TextStyled>
      {devices.map((device) => (
        <View key={device.macAddress}>
          <Text className='text-white'>{device.deviceName}</Text>
          <Button onPress={() => {
            setPrinters(state => {
              console.log('state', state)
              if (!state.some(printer => printer.deviceName === device.deviceName)) {
                return [...state, { ...device, copies: 1, print: true, bold: false }]
              }
              return state
            })
          }} ><Text className='text-white'>Conectar</Text></Button>
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

// TaskManager.defineTask('PRINT_WEBSOCKETS', async () => {
//   // DeviceEventEmitter.emit('background-pong', new Date().toISOString())
//   console.log('BACKGROUND MODE')
//   new Promise((resolve) => setTimeout(() => resolve('foi'), 2000)).then(data => console.log(data))
//   console.log(BackgroundFetch.BackgroundFetchResult.NewData);

//   // Be sure to return the successful result type!
//   return BackgroundFetch.BackgroundFetchResult.NewData;
// })