import { BluetoothPrinter } from "../hooks/useThermalPrinter";

export declare global {
  namespace ReactNavigation {
    interface RootParamList {
      auth: undefined;
      home: {
        updatePrinters?: boolean
      };
      printer: {
        printer: BluetoothPrinter
      };
      printers: undefined
    }
  }
}