export type Price = {
  value_ext_vat: number;
  value_inc_vat: number;
  valid_from: string;
  valid_to: string;
  payment_method: unknown;
};

export type OctopusResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    value_ext_vat: number;
    value_inc_vat: number;
    valid_from: string;
    valid_to: string;
    payment_method: unknown;
  }[];
};
