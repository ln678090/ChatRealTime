// src/utils/wsMessageEncoder.ts — thêm hàm này
import msgpack from '@msgpack/msgpack';

export const BinaryMessageType = {
    SEND_MESSAGE: 1,
    // ...các type khác...
    AI_CHAT_REQUEST: 30,
    AI_CHAT_RESPONSE: 31,
    AI_CHAT_COMPLETE: 32,
    AI_CHAT_ERROR: 33,
} as const;

interface AiChatRequestParams {
    conversationId: number;
    content: string;
    clientMsgId: string;
}

export function encodeAiChatRequest(params: AiChatRequestParams): Uint8Array {
    // Encode theo đúng format BinaryMessagePayload (13 fields)
    const payload = [
        BinaryMessageType.AI_CHAT_REQUEST, // 0: eventType
        params.conversationId,              // 1: conversationId
        '',                                 // 2: senderId (server override bằng JWT)
        0,                                  // 3: messageId (server tự set)
        params.content,                     // 4: content
        params.clientMsgId,                 // 5: clientMsgId
        Date.now(),                         // 6: timestamp
        null,                               // 7: metadata
        'TEXT',                             // 8: contentType
        '',                                 // 9: attachmentUrl
        '',                                 // 10: attachmentType
        '',                                 // 11: attachmentName
        0,                                  // 12: attachmentSize
    ];
    return msgpack.encode(payload);
}
