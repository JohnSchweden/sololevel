import 'setimmediate'

if (!global?.setImmediate) {
  global.setImmediate = setTimeout
}

export {default} from '../.rnstorybook'
