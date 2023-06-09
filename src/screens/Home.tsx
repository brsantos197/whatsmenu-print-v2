import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter, Permission, PermissionsAndroid, View, NativeModules, TouchableOpacity, Alert, AppRegistry, TaskProvider } from 'react-native';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/Ionicons';
import colors from 'tailwindcss/colors'
import { useKeepAwake } from 'expo-keep-awake';

import { BluetoothPrinter, useThermalPrinter } from '../hooks/useThermalPrinter';
import { getUser } from '../storage/user';

import { parse, useURL } from 'expo-linking';
import { WebView } from 'react-native-webview';
import { registerTaskWebSocket } from '../services/background.service';
import { getLocalPrinters, setLocalPrinters } from '../storage/printers';
import { useWebSocket } from '../hooks/useWebSocket';
import BackgroundTimer from 'react-native-background-timer';

type RouteParams = {
  updatePrinters?: boolean
}

export const Home = () => {
  const { navigate, dispatch } = useNavigation()
  const { params } = useRoute()
  const { devices, print } = useThermalPrinter()
  useKeepAwake()

  const [profile, setProfile] = useState<any>()
  const [printers, setPrinters] = useState<BluetoothPrinter[]>([])
  const [offsetY, setOffsetY] = useState(0)
  const [canUpdate, setCanUpdate] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  let redirectURL = useURL()
  const [deeplink, setDeeplink] = useState<typeof redirectURL>(null)

  const webViewRef = useRef<WebView>(null)
  // const { socket, connect } = useWebSocket(profile)

  // const handleLogOff = async () => {
  //   await removeUser()
  //   navigate('auth')
  // }

  const requestBatteryOp = async () => {
    const result = PermissionsAndroid.request("android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" as Permission)
  }

  const printForAllPrinters = useCallback(async (text: string) => {
    setDeeplink(state => null)
    for await (const printer of printers) {
      try {
        print(text, printer)
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
  }, [printers, profile, redirectURL])

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

  console.log(redirectURL, deeplink, "redirect");
  useEffect(() => {

    setDeeplink(() => redirectURL)
  }, [redirectURL])

  // useEffect(() => {
  //   console.log(printers.length);
  //   const intervalId = BackgroundTimer.setInterval(() => {
  //     console.log('tic', deeplink, new Date().getSeconds());
  //     if (deeplink) {
  //       printForAllPrinters(decodeURI(parse(deeplink).path!))
  //     }
  //   }, 1000)
  //   BackgroundTimer.clearInterval(intervalId - 1);
  // }, [deeplink, printers])

  useEffect(() => {
    console.log(printers.length);
    const intervalId = BackgroundTimer.setInterval(() => {
      console.log('tic', deeplink, new Date().getSeconds());
      printForAllPrinters(decodeURI(parse(redirectURL ?? 'oi').path!))
    }, 1000)
    BackgroundTimer.clearInterval(intervalId - 1);
  }, [printers])

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
    requestBatteryOp()
    DeviceEventEmitter.addListener('printers:updated', (printers) => {
      setPrinters(printers)
    })
  }, [])

  return (
    // <View className='flex-1'>
    //   <View className='flex-row justify-evenly items-center w-screen p-4 bg-zinc-200 dark:bg-zinc-800'>
    //     <TouchableOpacity>
    //       <MaterialIcons name='arrow-back' color={colors.green[500]} size={28} onPress={handleGoBack} />
    //     </TouchableOpacity>
    //     <TouchableOpacity>
    //       <MaterialIcons name='arrow-forward' color={colors.green[500]} size={28} onPress={handleGoForward} />
    //     </TouchableOpacity>
    //     <TouchableOpacity>
    //       <MaterialIcons name={isReloading ? 'close' : 'reload'} color={colors.green[500]} size={28} onPress={() => isReloading ? handleStopLoadPage() : handleReloadPage()} />
    //     </TouchableOpacity>
    //   </View>
    <WebView
      ref={webViewRef}
      source={{ uri: 'https://whatsmenu-adm-front-git-appprinter-grove-company.vercel.app/' }}
      javaScriptCanOpenWindowsAutomatically={true}
      mediaPlaybackRequiresUserAction={false}
      className='flex-1'
      onScroll={(e) => {
        setOffsetY(e.nativeEvent.contentOffset.y)
      }}
      onTouchMove={() => {
        setCanUpdate(true)
        if (offsetY <= 0) {
          setOffsetY(state => state - 1)
        }
      }}
      onTouchEnd={() => {
        if (offsetY <= -5 && canUpdate) {
          webViewRef.current?.reload()
          setOffsetY(0)
        }
      }}
    />
    // </View>
  );
}