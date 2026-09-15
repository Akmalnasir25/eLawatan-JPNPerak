import { Navigate } from 'react-router-dom'

// Pendaftaran dan log masuk berkongsi aliran yang sama: e-mel dipadankan
// dengan senarai sekolah JPN, kemudian OTP membuktikan pemilikan.
// Tiada borang pendaftaran berasingan — dan tiada kelulusan manual.
export function Daftar() {
  return <Navigate to="/masuk" replace />
}
