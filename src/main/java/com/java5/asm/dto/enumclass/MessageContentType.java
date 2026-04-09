package com.java5.asm.dto.enumclass;

import lombok.Getter;

@Getter
public enum MessageContentType {
    TEXT(0),      // Plain text message
    IMAGE(1),     // Image file (jpg, png, gif)
    VIDEO(2),     // Video file (mp4, webm)
    AUDIO(3),     // Audio file
    FILE(4);      // Other files (pdf, doc, zip)

    private final int code;

    MessageContentType(int code) {
        this.code = code;
    }

    //  Convert code to enum
    public static MessageContentType fromCode(int code) {
        for (MessageContentType type : values()) {
            if (type.code == code) {
                return type;
            }
        }
        return TEXT; // Default fallback
    }

    //  Convert string to enum (for DTO mapping)
    public static MessageContentType fromString(String value) {
        if (value == null || value.isEmpty()) {
            return TEXT;
        }
        try {
            return valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return TEXT; // Default fallback
        }
    }
}
