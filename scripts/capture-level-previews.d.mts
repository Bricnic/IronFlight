export interface VehiclePick {
  vehicle?: string;
  random?: boolean;
}
export function selectVehicle(vehicles: string[], at: number, opts?: VehiclePick): string;
export function main(argv: string[]): Promise<void>;
