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
  copies: number;
  bold: boolean;
  print: boolean
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

  const print = async (text: any, macAddress: string, printerWidthMM: 58 | 80) => {
    const printerNbrCharactersPerLine = printerWidthMM === 58 ? 32 : 50
    const payload = String(text).replaceAll('<hr>', `<b>${''.padStart(printerNbrCharactersPerLine, '=')}</b>\n`)
    await ThermalPrinterModule.printBluetooth({
      payload,
      macAddress,
      printerWidthMM,
      printerNbrCharactersPerLine
    })
  }

  useEffect(() => {
    requestPermissions()
      .then(async granted => {
        if (granted) {
          const newDevices = await ThermalPrinterModule.getBluetoothDeviceList()
          setDevices(newDevices)
        }
      })
  }, [])

  return {
    devices,
    print,
  }
}