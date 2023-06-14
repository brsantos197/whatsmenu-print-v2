import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from "react-native";

import ThermalPrinterModule from 'react-native-thermal-printer'
import * as ExpoDevice from "expo-device";

export type BluetoothDevice = {
  deviceName: string;
  macAddress: string;
  selected?: boolean;
}

export type BluetoothPrinter = BluetoothDevice & {
  nickname?: string;
  lines: number;
  font: 'lg' | 'sm'
  copies: number;
  bold: boolean;
  printerWidthMM: 58 | 80,
  error?: boolean
}

export const useThermalPrinter = () => {
  const [devices, setDevices] = useState<BluetoothDevice[]>([])

  const requestAndroid31Permissions = async () => {
    const bluetoothScanPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );
    const bluetoothConnectPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );
    const fineLocationPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );

    return (
      bluetoothScanPermission === "granted" &&
      bluetoothConnectPermission === "granted" &&
      fineLocationPermission === "granted"
    );
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "Bluetooth Low Energy requires Location",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const isAndroid31PermissionsGranted =
          await requestAndroid31Permissions();

        return isAndroid31PermissionsGranted;
      }
    } else {
      return true;
    }
  };

  const print = async (text: any, printer: BluetoothPrinter) => {
    try {
      const { bold, copies, font, printerWidthMM, macAddress, lines } = printer           

      // BOLD
      if (bold) {
        text = `<b>${text}</b>`
      }
      
      // if (font === 'lg') {
      //   text = `<font size='big'>${text}</font>`
      // }

      const printerNbrCharactersPerLine = printerWidthMM === 58 ? 32 : 50
      const lineHeight = String.fromCharCode(...[0x1b, 0x33, lines * 7])
      
      const payload = String(lineHeight + text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      let copiesCount = 0
      do {
        await ThermalPrinterModule.printBluetooth({
          payload,
          macAddress,
          printerWidthMM,
          printerNbrCharactersPerLine,
          mmFeedPaper: 15,
        })
        copiesCount++
      } while (copies > copiesCount);
    } catch (error) {
      throw error
    }
  }

  const getDevices = async () => {
    const devices = await ThermalPrinterModule.getBluetoothDeviceList()
    setDevices(devices)
  }

  useEffect(() => {
    requestPermissions()
      .then(async granted => {
        if (granted) {
          await getDevices()
        }
      })
  }, [])

  return {
    devices,
    print,
    getDevices
  }
}