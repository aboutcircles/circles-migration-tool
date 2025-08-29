import { createConfig, http } from 'wagmi'
import { gnosis } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [gnosis],
  connectors: [
    injected(),
  ],
  transports: {
    [gnosis.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
