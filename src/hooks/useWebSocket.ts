import { useCallback, useEffect, useState } from "react"
import { RequestType } from "../@types/request.type"
import { DeviceEventEmitter } from "react-native"

export const useWebSocket = (profile: any) => {
  const [pongInterval, setPongInterval] = useState<NodeJS.Timeout>()
  const [ws, setWs] = useState<WebSocket>()

  const connect = () => {
    setWs(new WebSocket('wss://rt2.whatsmenu.com.br/adonis-ws'))
  }


  useEffect(() => {
    connect()

    return () => {
      clearInterval(pongInterval)
    }
  }, [])

  useEffect(() => {
    if (ws) {
      ws.onopen = (event: any) => {
        console.log('%c[ws-connected]:', 'color: #0f0', `on ${event.target.url}`, ` - ${new Date().toTimeString()}`)

        const interval = setInterval(() => {
          ws.send(JSON.stringify({ t: 8 }))
        }, 1000 * 25);

        setPongInterval(interval)

        ws.send(JSON.stringify({
          t: 1,
          d: {
            topic: `print:${profile.slug}`
          }
        }))

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data)
          switch (data.t) {
            case 3: {
              console.log('%c[ws-subscribe]:', 'color: #ff0', `initiating subscription for ${data.d.topic} topic with server`, ` - ${new Date().toTimeString()}`)
              break;
            }
            case 7: {
              const data = JSON.parse(event.data)
              if (data.d.event.includes('print')) {
                const requests: RequestType[] = data.d.data.requests
                const colors = {
                  D: '#2185D0',
                  T: '#A5673F',
                  P: '#F57151'
                }
                requests.sort((a, b) => {
                  if (a.code > b.code) {
                    return 1
                  } else {
                    return -1
                  }
                }).forEach(request => {
                  DeviceEventEmitter.emit('request', request)
                  console.log(`%c[ws-request-${request.type}]:`, `color: ${colors[request.type]}`, `code ${request.code}`, `${request.tentatives > 0 ? request.tentatives + ' tentaiva reenvio' : ''}`, ` - ${new Date().toTimeString()}`)
                });
              }
              break;
            }
            case 9: {
              console.log('%c[ws-pong]:', 'color: #f57dd1', `pong packet +25s`)
              break;
            }
          }
        }

        ws.onclose = (event) => {
          console.log('%c[ws-disconnected]:', 'color: #f00', `code ${event.code} ${event.reason}`, ` - ${new Date().toTimeString()}`)
          clearInterval(pongInterval)
        }

      }
    }
  }, [ws])
  return {
    ws
  }
}
