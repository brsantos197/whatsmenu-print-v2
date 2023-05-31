import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Permission, PermissionsAndroid, View, NativeModules } from 'react-native';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';

import { BluetoothPrinter, useThermalPrinter } from '../hooks/useThermalPrinter';
import { getUser } from '../storage/user';

import { parse, useURL } from 'expo-linking';
import { WebView } from 'react-native-webview';
import { registerTaskWebSocket } from '../services/background.service';
import { getLocalPrinters, setLocalPrinters } from '../storage/printers';

type RouteParams = {
  updatePrinters?: boolean
}

export const Home = () => {
  const { navigate, dispatch } = useNavigation()
  const { params } = useRoute()
  const { devices, print } = useThermalPrinter()

  const [profile, setProfile] = useState<any>()
  const [printers, setPrinters] = useState<BluetoothPrinter[]>([])

  // const { socket, connect } = useWebSocket(profile)

  let redirectURL = useURL()

  // const handleLogOff = async () => {
  //   await removeUser()
  //   navigate('auth')
  // }

  const requestBatteryOp = async () => {
    const result = PermissionsAndroid.request("android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" as Permission)
    console.log(result);
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

  useEffect(() => {
    if (printers.length) {
      setLocalPrinters(printers)
    }
  }, [printers])

  useEffect(() => {
    if (redirectURL) {
      printForAllPrinters(decodeURI(parse(redirectURL).path!)).then(() => {
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
    }
  }, [params])

  // useEffect(() => {
  //   if (profile) {
  //     DeviceEventEmitter.removeAllListeners('request')
  //     DeviceEventEmitter.addListener('request', async (request) => {
  //       await printRequest(request)
  //     })
  //   }
  // }, [profile, printers])

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
      // console.log('caiu aqui pong front');
      // if (socket) {
      //   if (socket.readyState === socket.CLOSED) {
      //     connect()
      //   } else {
      //     socket?.send(JSON.stringify({ t: 8 }))
      //   }
      // }
    })
    requestBatteryOp()
  }, [])

  return (
    <View className='flex-1'>
      <WebView
        source={{ uri: 'https://whatsmenu-adm-front-git-appprinter-grove-company.vercel.app/' }}
        className='flex-1'
      />
    </View>
  );
}