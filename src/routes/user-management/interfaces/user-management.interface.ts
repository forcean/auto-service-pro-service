import { ObjectId } from 'typeorm';

export interface IUsers {
  id: ObjectId;
  publicId: string;
  firstname: string;
  lastname: string;
  email: string;
  phoneNumber: string
  role: string;
  managerName: string | null | undefined;
  activeFlag: boolean;
  lastAccessDt: Date | undefined;
}


export interface IGetUserWithPagination {
  page: number;
  limit:number;
  total: number;
  totalPages: number;
  users: IUsers[];
}

export interface IGetUser {
  id: ObjectId;
  publicId: string;
  email: string;
  phoneNumber: string;
  firstname: string;
  lastname: string;
  activeFlag: boolean;
  createdDt: Date;
  createdBy: string;
  lastLogin: Date | undefined;
  role: string;
  managerId: string | undefined;
  updatedDt: Date | undefined;
  updatedBy: string | undefined;
}
