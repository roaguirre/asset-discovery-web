export function isAllowlistedEmail(email: string | null | undefined): boolean {
  const value = String(email ?? '').trim().toLowerCase()
  if (!value) {
    return false
  }
  if (value === 'roaguirred@gmail.com') {
    return true
  }
  return value.endsWith('@zerofox.com')
}
