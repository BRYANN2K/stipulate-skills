import type { Register } from 'claude-code'

import { registerCore } from './core/index.ts'
import { registerUi } from './ui/index.tsx'

export const register: Register = (on, options) => {
  registerCore(on, options)
  registerUi(on, options)
}
