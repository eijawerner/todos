import axios from "axios";

const baseURL: string =
  typeof import.meta.env.VITE_BACKEND_URL === "string"
    ? import.meta.env.VITE_BACKEND_URL
    : "http://localhost:4000";

export const apiClient = axios.create({
  baseURL,
});