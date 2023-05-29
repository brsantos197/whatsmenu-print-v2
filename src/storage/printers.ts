import AsyncStorage from "@react-native-async-storage/async-storage";
import { PRINTERS } from "./storageConfig";

export const setLocalPrinters = async (printers: any[]) => {
  try {
    console.log('SALVANDO IMPRESSORAS')
    await AsyncStorage.setItem(PRINTERS, JSON.stringify(printers))
    const storage = await AsyncStorage.getItem(PRINTERS)
    console.log('IMPRESSORAS SALVAS', storage)
  } catch (error) {
    throw error
  }
}

export const getLocalPrinters = async () => {
  try {
    const storage = await AsyncStorage.getItem(PRINTERS)
    console.log(storage, "STORAGE");
    const user = storage ? JSON.parse(storage) : null
    return user
  } catch (error) {
    throw error
  }
}

export const removePrinter = async (id: number) => {
  try {
    // await AsyncStorage.removeItem(PRINTERS)
  } catch (error) {
    throw error
  }
}