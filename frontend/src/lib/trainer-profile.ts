export type TrainerProfile = {
  name: string
  email: string
  phone: string
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 15)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits.startsWith('1')) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return digits
}

export function contactErrors(profile: TrainerProfile) {
  const errors: Partial<Record<'phone', string>> = {}
  const digits = (profile.phone.match(/\d/g) ?? []).length
  if (profile.phone && (!/^[0-9+(). -]+$/.test(profile.phone) || digits < 7 || digits > 15)) errors.phone = 'Enter a valid phone number with 7–15 digits.'
  return errors
}
