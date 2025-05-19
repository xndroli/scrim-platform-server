export interface User {
  id: number;
  email: string;
  username: string;
  profileImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserInput {
  email: string;
  username: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  email: string;
  username: string;
  profileImage?: string;
}