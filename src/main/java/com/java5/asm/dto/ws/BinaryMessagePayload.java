package com.java5.asm.dto.ws;

import com.java5.asm.dto.enumclass.BinaryMessageType;
import com.java5.asm.dto.enumclass.MessageContentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.msgpack.core.MessageFormat;
import org.msgpack.core.MessagePack;
import org.msgpack.core.MessagePacker;
import org.msgpack.core.MessageUnpacker;
import org.msgpack.value.ValueType;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BinaryMessagePayload {
    // ===== WebSocket Event Type =====
    private BinaryMessageType eventType;

    // ===== Message Fields =====
    private Long conversationId;
    private UUID senderId;
    private Long messageId;
    private String content;
    private String clientMsgId;
    private Long timestamp;

    // ===== Message Content Type (TEXT, IMAGE, VIDEO, FILE) =====
    private MessageContentType contentType;

    // ===== File Attachment =====
    private String attachmentUrl;
    private String attachmentType;
    private String attachmentName;
    private Long attachmentSize;

    private Map<String, Object> metadata;

    // ===== Friend Notification Fields =====
    private String friendEventType; //
    private UUID actorId;
    private UUID targetId;
    private String uiStatus;

    // --- ENCODE (Server → Client) ---
    public byte[] encode() throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (MessagePacker packer = MessagePack.newDefaultPacker(baos)) {
            boolean isFriendEvent = BinaryMessageType.FRIEND_EVENT.equals(eventType);

            // Array size:
            // - Chat message: 13 fields (8 cơ bản + 1 contentType + 4 attachment)
            // - Friend event: 17 fields (13 + 4 friend fields)
            int arraySize = isFriendEvent ? 17 : 13;

            packer.packArrayHeader(arraySize);

            // [0] Event Type (WebSocket event: SEND_MESSAGE, TYPING, etc.)
            packer.packInt(eventType != null ? eventType.getCode() : 0);

            // [1] Conversation ID
            packer.packLong(conversationId != null ? conversationId : 0);

            // [2] Sender ID
            packer.packString(senderId != null ? senderId.toString() : "");

            // [3] Message ID
            packer.packLong(messageId != null ? messageId : 0);

            // [4] Content
            packer.packString(content != null ? content : "");

            // [5] Client Message ID
            packer.packString(clientMsgId != null ? clientMsgId : "");

            // [6] Timestamp
            packer.packLong(timestamp != null ? timestamp : System.currentTimeMillis());

            // [7] Metadata
            if (metadata != null && !metadata.isEmpty()) {
                packer.packMapHeader(metadata.size());
                for (Map.Entry<String, Object> entry : metadata.entrySet()) {
                    packer.packString(entry.getKey());
                    packer.packString(String.valueOf(entry.getValue()));
                }
            } else {
                packer.packNil();
            }

            // [8] Content Type (TEXT, IMAGE, VIDEO, FILE)
            packer.packString(contentType != null ? contentType.name() : MessageContentType.TEXT.name());

            // [9-12] File Attachment
            packer.packString(attachmentUrl != null ? attachmentUrl : "");
            packer.packString(attachmentType != null ? attachmentType : "");
            packer.packString(attachmentName != null ? attachmentName : "");
            packer.packLong(attachmentSize != null ? attachmentSize : 0);

            // [13-16] Friend Event Fields (only if FRIEND_EVENT)
            if (isFriendEvent) {
                packer.packString(friendEventType != null ? friendEventType : "");
                packer.packString(actorId != null ? actorId.toString() : "");
                packer.packString(targetId != null ? targetId.toString() : "");
                packer.packString(uiStatus != null ? uiStatus : "");
            }
        }
        return baos.toByteArray();
    }

    // --- DECODE (Client → Server) ---
    public static BinaryMessagePayload decode(byte[] data) throws IOException {
        try (MessageUnpacker unpacker = MessagePack.newDefaultUnpacker(data)) {
            BinaryMessagePayload payload = new BinaryMessagePayload();

            int arraySize = unpacker.unpackArrayHeader();

            // [0] Event Type
            payload.eventType = BinaryMessageType.fromCode(unpacker.unpackInt());

            // [1] Conversation ID
            payload.conversationId = unpackLongSafely(unpacker);

            // [2] Sender ID
            String senderStr = unpacker.unpackString();
            payload.senderId = (senderStr != null && !senderStr.isEmpty())
                    ? UUID.fromString(senderStr) : null;

            // [3] Message ID
            payload.messageId = unpackLongSafely(unpacker);

            // [4] Content
            payload.content = unpacker.unpackString();

            // [5] Client Message ID
            payload.clientMsgId = unpacker.unpackString();

            // [6] Timestamp
            payload.timestamp = unpackLongSafely(unpacker);

            // [7] Metadata
            if (!unpacker.tryUnpackNil()) {
                int mapSize = unpacker.unpackMapHeader();
                payload.metadata = new HashMap<>();
                for (int i = 0; i < mapSize; i++) {
                    String key = unpacker.unpackString();
                    String value = unpacker.unpackString();
                    payload.metadata.put(key, value);
                }
            }

            // [8] Content Type (if arraySize >= 9)
            if (arraySize >= 9) {
                String contentTypeStr = unpacker.unpackString();
                payload.contentType = (contentTypeStr != null && !contentTypeStr.isEmpty())
                        ? MessageContentType.valueOf(contentTypeStr)
                        : MessageContentType.TEXT;
            } else {
                payload.contentType = MessageContentType.TEXT; // Default
            }

            // [9-12] File Attachment (if arraySize >= 13)
            if (arraySize >= 13) {
                payload.attachmentUrl = unpacker.unpackString();
                payload.attachmentType = unpacker.unpackString();
                payload.attachmentName = unpacker.unpackString();
                payload.attachmentSize = unpackLongSafely(unpacker);
            }

            // [13-16] Friend Event Fields (if arraySize >= 17)
            if (arraySize >= 17) {
                payload.friendEventType = unpacker.unpackString();

                String actorStr = unpacker.unpackString();
                payload.actorId = (actorStr != null && !actorStr.isEmpty())
                        ? UUID.fromString(actorStr) : null;

                String targetStr = unpacker.unpackString();
                payload.targetId = (targetStr != null && !targetStr.isEmpty())
                        ? UUID.fromString(targetStr) : null;

                payload.uiStatus = unpacker.unpackString();
            }

            return payload;
        }
    }

    private static Long unpackLongSafely(MessageUnpacker unpacker) throws IOException {
        MessageFormat format = unpacker.getNextFormat();
        ValueType type = format.getValueType();
        switch (type) {
            case INTEGER:
                return unpacker.unpackLong();
            case FLOAT:
                return (long) unpacker.unpackDouble();
            case NIL:
                unpacker.unpackNil();
                return null;
            default:
                unpacker.skipValue();
                return 0L;
        }
    }
}
