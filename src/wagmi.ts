import { createConfig, http } from 'wagmi'
import { gnosis } from 'wagmi/chains'

export const config = createConfig({
  chains: [gnosis],
  transports: {
    [gnosis.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
