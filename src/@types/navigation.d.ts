import { BluetoothPrinter } from "../hooks/useThermalPrinter";

export declare global {
  namespace ReactNavigation {
    interface RootParamList {
      auth: undefined;
      home: undefined;
      printer: {
        printer: BluetoothPrinter
      };
    }
  }
}