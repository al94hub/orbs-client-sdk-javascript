import * as Encoding from "../crypto/Encoding";
import { NetworkType } from "../codec/NetworkType";
import { Argument } from "../codec/Arguments";
import { decodeSendTransactionResponse, encodeSendTransactionRequest, SendTransactionResponse } from "../codec/OpSendTransaction";
import { RunQueryResponse, decodeRunQueryResponse, encodeRunQueryRequest } from "../codec/OpRunQuery";
import { decodeGetTransactionStatusResponse, encodeGetTransactionStatusRequest, GetTransactionStatusResponse } from "../codec/OpGetTransactionStatus";
import { decodeGetTransactionReceiptProofResponse, encodeGetTransactionReceiptProofRequest, GetTransactionReceiptProofResponse } from "../codec/OpGetTransactionReceiptProof";
import axios, { AxiosResponse } from "axios";

const PROTOCOL_VERSION = 1;
const CONTENT_TYPE_MEMBUFFERS = "application/membuffers";
const SEND_TRANSACTION_URL = "/api/v1/send-transaction";
const RUN_QUERY_URL = "/api/v1/run-query";
const GET_TRANSACTION_STATUS_URL = "/api/v1/get-transaction-status";
const GET_TRANSACTION_RECEIPT_PROOF_URL = "/api/v1/get-transaction-receipt-proof";

export class Client {

  constructor(private endpoint: string, private virtualChainId: number, private networkType: NetworkType) {}

  createTransaction(publicKey: Uint8Array, privateKey: Uint8Array, contractName: string, methodName: string, inputArguments: Argument[]): [Uint8Array, string] {
    const [req, rawTxId] = encodeSendTransactionRequest({
      protocolVersion: PROTOCOL_VERSION,
      virtualChainId: this.virtualChainId,
      timestamp: new Date(),
      networkType: this.networkType,
      publicKey: publicKey,
      contractName: contractName,
      methodName: methodName,
      inputArguments: inputArguments
    }, privateKey);
    return [req, Encoding.encodeHex(rawTxId)];
  }

  createQuery(publicKey: Uint8Array, contractName: string, methodName: string, inputArguments: Argument[]): Uint8Array {
    return encodeRunQueryRequest({
      protocolVersion: PROTOCOL_VERSION,
      virtualChainId: this.virtualChainId,
      timestamp: new Date(),
      networkType: this.networkType,
      publicKey: publicKey,
      contractName: contractName,
      methodName: methodName,
      inputArguments: inputArguments
    });
  }

  protected createGetTransactionStatusPayload(txId: string): Uint8Array {
    const rawTxId = Encoding.decodeHex(txId);
    return encodeGetTransactionStatusRequest({
      protocolVersion: PROTOCOL_VERSION,
      virtualChainId: this.virtualChainId,
      txId: rawTxId
    });
  }

  protected createGetTransactionReceiptProofPayload(txId: string): Uint8Array {
    const rawTxId = Encoding.decodeHex(txId);
    return encodeGetTransactionReceiptProofRequest({
      protocolVersion: PROTOCOL_VERSION,
      virtualChainId: this.virtualChainId,
      txId: rawTxId
    });
  }

  async sendTransaction(rawTransaction: Uint8Array): Promise<SendTransactionResponse> {
    const res = await this.sendHttpPost(SEND_TRANSACTION_URL, rawTransaction);
    return decodeSendTransactionResponse(res.data);
  }

  async sendQuery(rawQuery: Uint8Array): Promise<RunQueryResponse> {
    const res = await this.sendHttpPost(RUN_QUERY_URL, rawQuery);
    return decodeRunQueryResponse(res.data);
  }

  async getTransactionStatus(txId: string): Promise<GetTransactionStatusResponse> {
    const payload = this.createGetTransactionStatusPayload(txId);
    const res = await this.sendHttpPost(GET_TRANSACTION_STATUS_URL, payload);
    return decodeGetTransactionStatusResponse(res.data);
  }

  async getTransactionReceiptProof(txId: string): Promise<GetTransactionReceiptProofResponse> {
    const payload = this.createGetTransactionReceiptProofPayload(txId);
    const res = await this.sendHttpPost(GET_TRANSACTION_RECEIPT_PROOF_URL, payload);
    return decodeGetTransactionReceiptProofResponse(res.data);
  }

  private async sendHttpPost(relativeUrl: string, payload: Uint8Array): Promise<AxiosResponse> {
    if (!payload || payload.byteLength == 0) {
      throw new Error(`payload sent by http is empty`);
    }
    const res = await axios.post(this.endpoint + relativeUrl, payload, {
      headers: { "Content-Type": CONTENT_TYPE_MEMBUFFERS } , responseType: "arraybuffer"
    });
    if (!res.data) {
      throw new Error(`no response data available, http status: ${res.status}, ${res.statusText}`);
    }
    return res;
  }

}