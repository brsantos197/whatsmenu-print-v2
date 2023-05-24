export interface RequestType {
  id: number;
  profileId: number;
  cupomId: number | null;
  cupom?: any | null;
  commandId: number | null;
  bartenderId: number | null;
  code: number;
  status: "production" | "transport" | "delivered" | "canceled" | null;
  name: string;
  contact: string;
  formPayment: string;
  formPaymentFlag: string;
  typeDelivery: number;
  type: "D" | "P" | "T";
  taxDelivery: number;
  timeDelivery: string | number;
  transshipment: number;
  total: number;
  print: number;
  tentatives: number;
  deliveryAddress: any;
  cart: any[];
  cartPizza: any[];
  created_at: string;
  update_at: string;
  slug: string;
  packageDate: string;
}