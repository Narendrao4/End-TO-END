import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;
import 'text-encoding';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
