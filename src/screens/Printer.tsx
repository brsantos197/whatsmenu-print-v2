import { useCallback, useEffect, useState } from 'react';
import { View, BackHandler, DeviceEventEmitter, ScrollView, useColorScheme, Switch } from 'react-native';
import RadioGroup from 'react-native-radio-buttons-group';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { DateTime } from 'luxon';

import colors from 'tailwindcss/colors'

import { PizzaCartType, ProductCartType, RequestType } from '../@types/request.type';
import { BluetoothPrinter, useThermalPrinter } from '../hooks/useThermalPrinter';
import { useWebSocket } from '../hooks/useWebSocket';
import { getUser, removeUser } from '../storage/user';

import { Page } from '../components/Page';
import { TextStyled } from '../components/TextStyled';
import { Button } from '../components/Button';
import { DevicesModal } from '../components/DevicesModal';
import { getLocalPrinters, setLocalPrinters } from '../storage/printers';
import { Input } from '../components/Input';

type RouteParams = {
  printer: BluetoothPrinter
}

export const Printer = () => {
  const { navigate } = useNavigation()
  const { params } = useRoute()
  const colorScheme = useColorScheme()

  const [printer, setPrinter] = useState<BluetoothPrinter>((params as RouteParams).printer)

  const radioContainerStyle = {
    display: 'flex',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    width: '100%',
  }

  const labelStyle = {
    color: colorScheme === 'dark' ? colors.zinc[50] : colors.zinc[950],
    fontSize: 16,
    marginTop: 4,
    marginBottom: 4
  }


  return (
    <Page className='justify-start'>
      <View className='dark:bg-zinc-800 light:bg-zinc-400 p-4 mb-1 w-screen'>
        <TextStyled className='text-2xl font-bold'>Impressora</TextStyled>
      </View>
      <ScrollView className='flex-1 p-4 mt-4 w-screen'>
        <TextStyled className='mx-auto mb-10 text-lg font-bold'>BT - ({printer.deviceName})</TextStyled>
        <View>
          <TextStyled className='text-base mb-2'>Apelido da Impressora</TextStyled>
          <Input
            value={printer.nickname}
            placeholder='Ex: Impressora Caixa, Impressora Cozinha...'
            onChangeText={(text) => setPrinter(state => ({ ...state, nickname: text }))}
          />
        </View>

        <View>
          <TextStyled className='text-base mb-2'>Quantidade de Cópias</TextStyled>
          <Input
            keyboardType='numeric'
            value={String(printer.copies)}
            onChangeText={(text) => setPrinter(state => ({ ...state, copies: Number(text) }))}
          />
        </View>

        <View>
          <TextStyled className='text-base mb-2'>Espaçamento Entrelinhas</TextStyled>
          <Input
            keyboardType='numeric'
            value={String(printer.lines)}
            onChangeText={(text) => setPrinter(state => ({ ...state, lines: Number(text) }))}
          />
        </View>

        <View className='flex-row items-center justify-between '>
          <TextStyled className='text-base mb-2'>Negrito</TextStyled>
          <Switch
            trackColor={{ false: colors.zinc[300], true: colors.green[300] }}
            thumbColor={printer.bold ? colors.green[500] : colors.zinc[50]}
            ios_backgroundColor="#3e3e3e"
            onValueChange={() => { setPrinter(state => ({ ...state, bold: !state.bold })) }}
            value={printer.bold}
          />
        </View>

        <RadioGroup
          radioButtons={[
            {
              id: 'lg',
              label: 'Grande',
              containerStyle: radioContainerStyle,
              labelStyle,
              value: printer.font,
              color: colors.green[500]
            },
            {
              id: 'sm',
              label: 'Pequena',
              containerStyle: radioContainerStyle,
              labelStyle,
              value: printer.font,
              color: colors.green[500]
            }
          ]}
          containerStyle={{
            marginLeft: -8,
            marginTop: 10
          }}
          selectedId={printer.font}
          onPress={(value) => {
            setPrinter(state => ({ ...state, font: value as 'lg' | 'sm' }))
          }}
        />
        <Button className='mt-4'>
          <TextStyled>Apagar</TextStyled>
        </Button>
      </ScrollView>
    </Page>
  );
}

// TaskManager.defineTask('PRINT_WEBSOCKETS', async () => {
//   // DeviceEventEmitter.emit('background-pong', new Date().toISOString())
//   console.log('BACKGROUND MODE')
//   new Promise((resolve) => setTimeout(() => resolve('foi'), 2000)).then(data => console.log(data))
//   console.log(BackgroundFetch.BackgroundFetchResult.NewData);

//   // Be sure to return the successful result type!
//   return BackgroundFetch.BackgroundFetchResult.NewData;
// })