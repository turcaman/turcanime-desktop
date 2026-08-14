import ElectronStore from 'electron-store';

// conf (the base class of electron-store) only ships its types via an
// "exports" map, which the node10 moduleResolution used here cannot follow;
// the base class therefore resolves to `any` and its members are missing from
// the inferred instance type. Declare the surface the app actually uses and
// bridge once at this boundary instead of casting per consumer.
interface StoreShape {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
  delete: (key: string) => void;
  store: Record<string, unknown>;
}

export const store = new ElectronStore() as unknown as StoreShape;
