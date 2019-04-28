/**
 * Copyright 2019 the orbs-client-sdk-javascript authors
 * This file is part of the orbs-client-sdk-javascript library in the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */

import * as Encoding from "../crypto/Encoding";
import { NetworkType } from "../codec/NetworkType";
import { Argument } from "../codec/Arguments";
import { decodeSendTransactionResponse, encodeSendTransactionRequest, SendTransactionResponse } from "../codec/OpSendTransaction";
import { RunQueryResponse, decodeRunQueryResponse, encodeRunQueryRequest } from "../codec/OpRunQuery";
import { decodeGetTransactionStatusResponse, encodeGetTransactionStatusRequest, GetTransactionStatusResponse } from "../codec/OpGetTransactionStatus";
import { decodeGetTransactionReceiptProofResponse, encodeGetTransactionReceiptProofRequest, GetTransactionReceiptProofResponse } from "../codec/OpGetTransactionReceiptProof";
import { decodeGetBlockResponse, encodeGetBlockRequest, GetBlockResponse } from "../codec/OpGetBlock";
import axios, { AxiosResponse } from "axios";
import { getTextDecoder } from "../membuffers/text";

const PROTOCOL_VERSION = 1;
const CONTENT_TYPE_MEMBUFFERS = "application/membuffers";
const SEND_TRANSACTION_URL = "/api/v1/send-transaction";
const RUN_QUERY_URL = "/api/v1/run-query";
const GET_TRANSACTION_STATUS_URL = "/api/v1/get-transaction-status";
const GET_TRANSACTION_RECEIPT_PROOF_URL = "/api/v1/get-transaction-receipt-proof";
const GET_BLOCK_URL = "/api/v1/get-block";

export class Client {
  constructor(private endpoint: string, private virtualChainId: number, private networkType: NetworkType) {}

  createTransaction(publicKey: Uint8Array, privateKey: Uint8Array, contractName: string, methodName: string, inputArguments: Argument[]): [Uint8Array, string] {
    const [req, rawTxId] = encodeSendTransactionRequest(
      {
        protocolVersion: PROTOCOL_VERSION,
        virtualChainId: this.virtualChainId,
        timestamp: new Date(),
        networkType: this.networkType,
        publicKey: publicKey,
        contractName: contractName,
        methodName: methodName,
        inputArguments: inputArguments,
      },
      privateKey,
    );
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
      inputArguments: inputArguments,
    });
  }

  protected createGetTransactionStatusPayload(txId: string): Uint8Array {
    const rawTxId = Encoding.decodeHex(txId);
    return encodeGetTransactionStatusRequest({
      protocolVersion: PROTOCOL_VERSION,
      virtualChainId: this.virtualChainId,
      txId: rawTxId,
    });
  }

  protected createGetTransactionReceiptProofPayload(txId: string): Uint8Array {
    const rawTxId = Encoding.decodeHex(txId);
    return encodeGetTransactionReceiptProofRequest({
      protocolVersion: PROTOCOL_VERSION,
      virtualChainId: this.virtualChainId,
      txId: rawTxId,
    });
  }

  protected createGetBlockPayload(blockHeight: bigint): Uint8Array {
    return encodeGetBlockRequest({
      protocolVersion: PROTOCOL_VERSION,
      virtualChainId: this.virtualChainId,
      blockHeight: blockHeight,
    });
  }

  async sendTransaction(rawTransaction: Uint8Array): Promise<SendTransactionResponse> {
    const res = await this.sendHttpPost(SEND_TRANSACTION_URL, rawTransaction);
    return decodeSendTransactionResponse(res);
  }

  async sendQuery(rawQuery: Uint8Array): Promise<RunQueryResponse> {
    const res = await this.sendHttpPost(RUN_QUERY_URL, rawQuery);
    return decodeRunQueryResponse(res);
  }

  async getTransactionStatus(txId: string): Promise<GetTransactionStatusResponse> {
    const payload = this.createGetTransactionStatusPayload(txId);
    const res = await this.sendHttpPost(GET_TRANSACTION_STATUS_URL, payload);
    return decodeGetTransactionStatusResponse(res);
  }

  async getTransactionReceiptProof(txId: string): Promise<GetTransactionReceiptProofResponse> {
    const payload = this.createGetTransactionReceiptProofPayload(txId);
    const res = await this.sendHttpPost(GET_TRANSACTION_RECEIPT_PROOF_URL, payload);
    return decodeGetTransactionReceiptProofResponse(res);
  }

  async getBlock(blockHeight: bigint): Promise<GetBlockResponse> {
    const payload = this.createGetBlockPayload(blockHeight);
    const res = await this.sendHttpPost(GET_BLOCK_URL, payload);
    return decodeGetBlockResponse(res);
  }

  private async sendHttpPost(relativeUrl: string, payload: Uint8Array): Promise<Uint8Array> {
    if (!payload || payload.byteLength == 0) {
      throw new Error(`payload sent by http is empty`);
    }

    const res = await axios.post<Uint8Array>(this.endpoint + relativeUrl, payload, {
      headers: { "content-type": CONTENT_TYPE_MEMBUFFERS },
      responseType: "arraybuffer",
      validateStatus: status => true,
    });

    // check if we have the content type response we expect
    const contentType = res.headers["content-type"];
    if (contentType != CONTENT_TYPE_MEMBUFFERS) {
      if (contentType == "text/plain" || contentType == "application/json") {
        throw new Error(`http request failed: ${getTextDecoder().decode(res.data)}`);
      } else {
        throw new Error(`http request failed with unexpected Content-Type '${contentType}'`);
      }
    }

    if (!res.data) {
      throw new Error(`no response data available, http status: ${res.status} ${res.statusText}`);
    }

    if (res.data.constructor === ArrayBuffer) {
      return new Uint8Array(res.data);
    }

    return res.data;
  }
}
