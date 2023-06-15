import { useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import BackgroundTimer from 'react-native-background-timer';

export const useWebSocket = (profile: any, onClose?: () => any) => {
  const [socket, setSocket] = useState<WebSocket>()
  const [pongInterval, setPongInterval] = useState<number>()
  const [status, setStatus] = useState(socket?.readyState ?? 0)

  const connect = () => {
    setSocket(new WebSocket('wss://rt2.whatsmenu.com.br/adonis-ws'))
  }

  const ononpen = (event: any) => {
    if (socket) {
      console.log('%c[ws-connected]:', 'color: #0f0', `on ${event.target.url}`, ` - ${new Date().toTimeString()}`)
      const intervalId = BackgroundTimer.setInterval(() => {
        socket.send(JSON.stringify({ t: 8 }))
      }, 10 * 1000)
      setPongInterval(intervalId)
      socket.send(JSON.stringify({
        t: 1,
        d: {
          topic: `print:${profile?.slug}`
        }
      }))
      socket.onmessage = async (event) => {
        const data = JSON.parse(event.data)
        console.log(data);
        switch (data.t) {
          case 3: {
            console.log('%c[ws-subscribe]:', 'color: #ff0', `initiating subscription for ${data.d.topic} topic with server`, ` - ${new Date().toTimeString()}`)
            break;
          }
          case 7: {
            const data = JSON.parse(event.data)
            if (data.d.event.includes('print')) {
              DeviceEventEmitter.emit('request:print', data.d.data)
            }
            if (data.d.event.includes('directPrint')) {
              DeviceEventEmitter.emit('request:directPrint', data.d.data)
            }
            // if (data.d.event.includes('print')) {
            //   const requests: RequestType[] = data.d.data.requests
            //   const colors = {
            //     D: '#2185D0',
            //     T: '#A5673F',
            //     P: '#F57151'
            //   }
            //   requests.sort((a, b) => {
            //     if (a.code > b.code) {
            //       return 1
            //     } else {
            //       return -1
            //     }
            //   }).forEach(request => {
            //     DeviceEventEmitter.emit('request:print', request)
            //     console.log(`%c[ws-request-${request.type}]:`, `color: ${colors[request.type]}`, `code ${request.code}`, `${request.tentatives > 0 ? request.tentatives + ' tentaiva reenvio' : ''}`, ` - ${new Date().toTimeString()}`)
            //   });
            // }
            break;
          }
          case 9: {
            console.log('%c[ws-pong]:', 'color: #f57dd1', `pong packet +25s`)
            break;
          }
        }
      }
      socket.onclose = (event) => {
        console.log('%c[ws-disconnected]:', 'color: #f00', `code ${event.code} ${event.reason}`, ` - ${new Date().toTimeString()}`)
        BackgroundTimer.clearInterval(pongInterval!);
        if (event.reason !== 'logoff') {
          onClose && onClose()
          connect()
        }
      }

    }
  }

  useEffect(() => {
    if (profile && !socket) {
      connect()
    }
  }, [profile])

  useEffect(() => {
    if ((socket && !socket.onopen) && profile) {
      socket.onopen = ononpen
    }
  }, [socket, profile])

  useEffect(() => {
    setStatus(state => socket?.readyState ?? 0)
    setTimeout(() => {
      setStatus(state => socket?.readyState ?? 0)
    }, 1000 * 10);
  }, [socket?.readyState])

  return {
    socket,
    connect,
    status
  }
}
