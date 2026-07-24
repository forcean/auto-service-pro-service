export interface IMenuNode {
  seq: number;
  key: string;
  displayName: string;
  icon: string | null;
  endpoint: string | null;
  activeFlag: boolean;
  children: IMenuNode[];
}

export interface IMenuResponse {
  role: string;
  menus: IMenuNode[];
}