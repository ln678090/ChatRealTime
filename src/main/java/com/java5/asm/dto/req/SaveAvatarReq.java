package com.java5.asm.dto.req;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SaveAvatarReq {
    private String url;         // ImageKit URL
    private String fileId;      // ImageKit fileId (optional)
    private String thumbnailUrl; // Thumbnail URL (optional)
}
