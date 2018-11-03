import * as Protocol from "../protocol/Protocol";
import { InternalMessage } from "../membuffers/message";
import { MethodArgumentArray_Scheme } from "../protocol/Protocol";

export type MethodArgument = Uint32 | Uint64 | Str | Bytes;

export class Uint32 {
  constructor(public value: number) {}
}

export class Uint64 {
  constructor(public value: BigInt) {}
}

export class Str {
  constructor(public value: string) {}
}

export class Bytes {
  constructor(public value: Uint8Array) {}
}

function methodArgumentsBuilders(args: MethodArgument[]): Protocol.MethodArgumentBuilder[] {
  const res: Protocol.MethodArgumentBuilder[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg.constructor) {
      case Uint32:
        res.push(new Protocol.MethodArgumentBuilder({name: "uint32", type: 0, value: arg.value}));
        break;
      case Uint64:
        res.push(new Protocol.MethodArgumentBuilder({name: "uint64", type: 1, value: arg.value}));
        break;
      case Str:
        res.push(new Protocol.MethodArgumentBuilder({name: "string", type: 2, value: arg.value}));
        break;
      case Bytes:
        res.push(new Protocol.MethodArgumentBuilder({name: "bytes", type: 3, value: arg.value}));
        break;
      default:
        throw new Error(`MethodArgument unknown type: ${arg}`);
    }
  }
  return res;
}

function methodArgumentsArray(args: MethodArgument[]): InternalMessage {
  const builders = methodArgumentsBuilders(args);
  const buf = new Protocol.MethodArgumentArrayBuilder({arguments: builders}).build();
  return new InternalMessage(buf, buf.byteLength, Protocol.MethodArgumentArray_Scheme, []);
}

export function methodArgumentsOpaqueEncode(args: MethodArgument[]): Uint8Array {
  const msg = methodArgumentsArray(args);
  return msg.rawBufferForField(0, 0);
}

export function methodArgumentsOpaqueDecode(buf: Uint8Array): MethodArgument[] {
  const res: MethodArgument[] = [];
  const argsArrayMsg = new InternalMessage(buf, buf.byteLength, MethodArgumentArray_Scheme, []);
  const iterator = argsArrayMsg.getMessageArrayIterator(0);
  let index = 0;
  while (iterator.hasNext()) {
    const [methodArgumentBuf, methodArgumentBufLength] = iterator.nextMessage();
    const methodArgumentMsg = new InternalMessage(methodArgumentBuf, methodArgumentBufLength, Protocol.MethodArgument_Scheme, Protocol.MethodArgument_Unions);
    const type = methodArgumentMsg.getUnionIndex(1, 0);
    switch (type) {
      case 0:
        const [, uint32Off] = methodArgumentMsg.isUnionIndex(1, 0, 0);
        res.push(new Uint32(methodArgumentMsg.getUint32InOffset(uint32Off)));
        break;
      case 1:
        const [, uint64Off] = methodArgumentMsg.isUnionIndex(1, 0, 1);
        res.push(new Uint64(methodArgumentMsg.getUint64InOffset(uint64Off)));
        break;
      case 2:
        const [, stringOff] = methodArgumentMsg.isUnionIndex(1, 0, 2);
        res.push(new Str(methodArgumentMsg.getStringInOffset(stringOff)));
        break;
      case 3:
        const [, bytesOff] = methodArgumentMsg.isUnionIndex(1, 0, 3);
        res.push(new Bytes(methodArgumentMsg.getBytesInOffset(bytesOff)));
        break;
      default:
        throw new Error(`received method argument ${index} has unknown type: ${type}`);
    }
    index++;
  }
  return res;
}